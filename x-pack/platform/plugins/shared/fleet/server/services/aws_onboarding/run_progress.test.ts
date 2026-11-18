/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { appContextService } from '../app_context';

import { awsOnboardingStackService } from './stacks';
import { readAwsOnboardingRunProgress } from './run_progress';

jest.mock('../app_context');
jest.mock('./stacks', () => ({
  awsOnboardingStackService: { createStatusClient: jest.fn(), statusWith: jest.fn() },
}));

const createStatusClient = awsOnboardingStackService.createStatusClient as jest.Mock;
const statusWith = awsOnboardingStackService.statusWith as jest.Mock;

const STACK_ID = 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-onboarding-ab/1';
const T0 = '2026-11-18T10:00:00.000Z';

const stepRun = (
  stepId: string,
  index: number,
  {
    status = 'completed',
    output,
    startedAt = T0,
    finishedAt,
  }: { status?: string; output?: unknown; startedAt?: string; finishedAt?: string } = {}
) => ({
  id: `${stepId}-${index}`,
  stepId,
  globalExecutionIndex: index,
  scopeStack: [],
  status,
  startedAt,
  ...(finishedAt && { finishedAt }),
  ...(output !== undefined && { output }),
});

const execution = (
  stepExecutions: unknown[],
  { status = 'running', error = null }: { status?: string; error?: { message: string } | null } = {}
) =>
  ({
    id: 'exec-1',
    status,
    error,
    startedAt: T0,
    stepExecutions,
  } as unknown as WorkflowExecutionDto);

const resolveStep = (output: Record<string, unknown> = {}) =>
  stepRun('resolve', 1, {
    output: {
      stack_action: 'create',
      identity_name: 'my-identity',
      policies: [
        { service: 'guardduty', name: 'aws-guardduty' },
        { service: 'ec2', name: 'aws-ec2' },
      ],
      ...output,
    },
  });
const reuseResolveStep = (stackAction: 'update' | 'none') =>
  resolveStep({ stack_action: stackAction, cloud_connector_id: 'cc-1' });
const createStackStep = () =>
  stepRun('create_stack', 2, {
    output: { stack_id: STACK_ID, stack_name: 'elastic-onboarding-ab' },
  });
const stackStatusStep = (output: Record<string, unknown>, stepId = 'stack_status') =>
  stepRun(stepId, 3, { output });
const stackComplete = () =>
  stackStatusStep({
    status: 'complete',
    stack_status: 'CREATE_COMPLETE',
    role_arn: 'arn:aws:iam::123456789012:role/r',
  });
const connectorStep = () =>
  stepRun('create_connector', 4, { output: { cloud_connector_id: 'cc-new' } });
const policiesStep = () =>
  stepRun('create_policies', 5, {
    output: {
      policies: [
        { service: 'guardduty', policy_id: 'p-gd' },
        { service: 'ec2', policy_id: 'p-ec2' },
      ],
      policy_ids: ['p-gd', 'p-ec2'],
    },
  });
const hasDataStep = (
  index: number,
  output: { has_data: boolean; policies_with_data: string[]; policies_without_data: string[] },
  startedAt = T0
) => stepRun('has_data', index, { output: { ...output, agents: [] }, startedAt });
const noData = { has_data: false, policies_with_data: ['p-gd'], policies_without_data: ['p-ec2'] };
const allData = {
  has_data: true,
  policies_with_data: ['p-gd', 'p-ec2'],
  policies_without_data: [],
};
const doneStep = (index: number) =>
  stepRun('done', index, { output: { dashboard_path: '/app/dashboards#/view/aws' } });

const throughPolicies = () => [
  resolveStep(),
  createStackStep(),
  stackComplete(),
  connectorStep(),
  policiesStep(),
];

describe('readAwsOnboardingRunProgress', () => {
  const logger = { warn: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(appContextService.getLogger).mockReturnValue(logger as any);
    createStatusClient.mockResolvedValue({ client: 'session' });
  });

  describe('stack', () => {
    it('is pending before any stack step has output', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([resolveStep(), stepRun('create_stack', 2, { status: 'running' })])
      );

      expect(progress.stack).toEqual({ phase: 'pending', resources: [] });
    });

    it('is skipped when the run reuses an identity without a stack action', async () => {
      const progress = await readAwsOnboardingRunProgress(execution([reuseResolveStep('none')]));

      expect(progress.stack.phase).toBe('skipped');
    });

    it('is skipped when the stack update has no changes', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([
          reuseResolveStep('update'),
          stepRun('update_stack', 2, {
            output: { stack_id: STACK_ID, stack_name: 'elastic-onboarding-ab', no_changes: true },
          }),
        ])
      );

      expect(progress.stack).toMatchObject({
        phase: 'skipped',
        stack_name: 'elastic-onboarding-ab',
      });
      expect(statusWith).not.toHaveBeenCalled();
    });

    it('reads the stack live while its poll has no terminal status, on one session', async () => {
      const resources = [
        { logicalId: 'Role', status: 'CREATE_IN_PROGRESS', updatedAt: '2026-11-18T10:00:05Z' },
      ];
      statusWith.mockResolvedValue({
        status: 'in_progress',
        stackStatus: 'CREATE_IN_PROGRESS',
        resources,
      });

      const progress = await readAwsOnboardingRunProgress(
        execution([
          resolveStep(),
          createStackStep(),
          stackStatusStep({ status: 'in_progress', stack_status: 'CREATE_IN_PROGRESS' }),
        ])
      );

      expect(progress.stack).toEqual({
        phase: 'in_progress',
        stack_id: STACK_ID,
        stack_name: 'elastic-onboarding-ab',
        stack_status: 'CREATE_IN_PROGRESS',
        resources,
      });
      expect(createStatusClient).toHaveBeenCalledTimes(1);
      expect(statusWith).toHaveBeenCalledWith({ client: 'session' }, STACK_ID);
    });

    it('uses the given stack client instead of creating one', async () => {
      statusWith.mockResolvedValue({ status: 'in_progress', resources: [] });

      await readAwsOnboardingRunProgress(execution([resolveStep(), createStackStep()]), {
        stackClient: Promise.resolve({ client: 'given' } as any),
      });

      expect(createStatusClient).not.toHaveBeenCalled();
      expect(statusWith).toHaveBeenCalledWith({ client: 'given' }, STACK_ID);
    });

    it('falls back to the step output and warns once when the live read fails', async () => {
      statusWith.mockRejectedValue(new Error('throttled'));

      const progress = await readAwsOnboardingRunProgress(
        execution([
          resolveStep(),
          createStackStep(),
          stackStatusStep({ status: 'in_progress', stack_status: 'CREATE_IN_PROGRESS' }),
        ])
      );

      expect(progress.stack).toMatchObject({
        phase: 'in_progress',
        stack_status: 'CREATE_IN_PROGRESS',
        resources: [],
      });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('throttled'));
    });

    it('is complete from the poll output without a live read or the role ARN', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([resolveStep(), createStackStep(), stackComplete()])
      );

      expect(progress.stack).toEqual({
        phase: 'complete',
        stack_id: STACK_ID,
        stack_name: 'elastic-onboarding-ab',
        stack_status: 'CREATE_COMPLETE',
        resources: [],
      });
      expect(createStatusClient).not.toHaveBeenCalled();
    });

    it('is failed with the reason from the poll output', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution(
          [
            resolveStep(),
            createStackStep(),
            stackStatusStep({
              status: 'failed',
              stack_status: 'ROLLBACK_COMPLETE',
              reason: 'Role: AccessDenied',
            }),
          ],
          { status: 'failed', error: { message: 'The CloudFormation stack did not complete' } }
        )
      );

      expect(progress.stack).toMatchObject({ phase: 'failed', reason: 'Role: AccessDenied' });
      expect(progress.connector.phase).toBe('pending');
    });
  });

  describe('connector', () => {
    it('is pending until create_connector has output', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([
          resolveStep(),
          createStackStep(),
          stackComplete(),
          stepRun('create_connector', 4, { status: 'running' }),
        ])
      );

      expect(progress.connector).toEqual({ phase: 'pending' });
    });

    it('is complete with the identity name once create_connector has output', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([resolveStep(), createStackStep(), stackComplete(), connectorStep()])
      );

      expect(progress.connector).toEqual({
        phase: 'complete',
        name: 'my-identity',
        cloud_connector_id: 'cc-new',
      });
    });

    it('is reused when the run does not create a stack', async () => {
      const progress = await readAwsOnboardingRunProgress(execution([reuseResolveStep('update')]));

      expect(progress.connector).toEqual({
        phase: 'reused',
        name: 'my-identity',
        cloud_connector_id: 'cc-1',
      });
    });

    it('is failed when the run failed on update_connector', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution(
          [
            reuseResolveStep('update'),
            stepRun('update_stack', 2, {
              output: { stack_id: STACK_ID, stack_name: 'elastic-onboarding-ab', no_changes: true },
            }),
            stepRun('update_connector', 3, { status: 'failed' }),
          ],
          { status: 'failed', error: { message: 'connector not found' } }
        )
      );

      expect(progress.connector.phase).toBe('failed');
      expect(progress.policies.phase).toBe('pending');
      expect(progress.error).toBe('connector not found');
    });
  });

  describe('policies', () => {
    it('is pending with the planned policies until create_policies has started', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([resolveStep(), createStackStep(), stackComplete(), connectorStep()])
      );

      expect(progress.policies).toEqual({
        phase: 'pending',
        items: [
          { service: 'guardduty', name: 'aws-guardduty' },
          { service: 'ec2', name: 'aws-ec2' },
        ],
      });
    });

    it('is in progress while create_policies runs', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([
          resolveStep(),
          createStackStep(),
          stackComplete(),
          connectorStep(),
          stepRun('create_policies', 5, { status: 'running' }),
        ])
      );

      expect(progress.policies.phase).toBe('in_progress');
    });

    it('is complete with each policy id, name and data flag', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([...throughPolicies(), hasDataStep(6, noData)])
      );

      expect(progress.policies).toEqual({
        phase: 'complete',
        items: [
          { service: 'guardduty', name: 'aws-guardduty', policy_id: 'p-gd', has_data: true },
          { service: 'ec2', name: 'aws-ec2', policy_id: 'p-ec2', has_data: false },
        ],
      });
    });

    it('is failed with the execution error when create_policies fails', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution(
          [
            resolveStep(),
            createStackStep(),
            stackComplete(),
            connectorStep(),
            stepRun('create_policies', 5, { status: 'failed' }),
          ],
          { status: 'failed', error: { message: 'package policy conflict' } }
        )
      );

      expect(progress.policies.phase).toBe('failed');
      expect(progress.connector.phase).toBe('complete');
      expect(progress.error).toBe('package policy conflict');
    });
  });

  describe('data', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('is pending until has_data has output', async () => {
      const progress = await readAwsOnboardingRunProgress(execution(throughPolicies()));

      expect(progress.data).toEqual({ phase: 'pending' });
    });

    it('is waiting with the seconds since the first data check started', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-18T10:04:10.500Z'));

      const progress = await readAwsOnboardingRunProgress(
        execution(
          [
            ...throughPolicies(),
            hasDataStep(6, noData, '2026-11-18T10:00:00.000Z'),
            hasDataStep(8, noData, '2026-11-18T10:00:20.000Z'),
          ],
          { status: 'waiting' }
        )
      );

      expect(progress.data).toEqual({ phase: 'waiting', waited_seconds: 250 });
    });

    it('is waiting with no wait time when the data check has no start time', async () => {
      const { startedAt: _startedAt, ...unstarted } = hasDataStep(6, noData);

      const progress = await readAwsOnboardingRunProgress(
        execution([...throughPolicies(), unstarted], { status: 'waiting' })
      );

      expect(progress.data).toEqual({ phase: 'waiting', waited_seconds: 0 });
    });

    it('is complete once every policy has data', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([...throughPolicies(), hasDataStep(6, noData), hasDataStep(8, allData)])
      );

      expect(progress.data).toEqual({ phase: 'complete' });
    });

    it('is partial when the run completed with some policies without data', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([...throughPolicies(), hasDataStep(6, noData), doneStep(7)], {
          status: 'completed',
        })
      );

      expect(progress.data).toEqual({ phase: 'partial' });
    });
  });

  describe('run', () => {
    it('carries the execution status and the dashboard path once completed', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([...throughPolicies(), hasDataStep(6, allData), doneStep(7)], {
          status: 'completed',
        })
      );

      expect(progress.status).toBe('completed');
      expect(progress.dashboard_path).toBe('/app/dashboards#/view/aws');
      expect(progress).not.toHaveProperty('error');
    });

    it.each(['cancelled', 'timed_out'])(
      'marks the first unfinished phase failed with the error when the run is %s',
      async (status) => {
        const progress = await readAwsOnboardingRunProgress(
          execution([resolveStep(), createStackStep(), stackComplete(), connectorStep()], {
            status,
            error: { message: 'stopped' },
          })
        );

        expect(progress).toMatchObject({
          status,
          error: 'stopped',
          stack: { phase: 'complete' },
          connector: { phase: 'complete' },
          policies: { phase: 'failed' },
          data: { phase: 'pending' },
        });
      }
    );

    it('fails the stack row with the error when the run is cancelled while the stack moves', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([resolveStep(), createStackStep()], {
          status: 'cancelled',
          error: { message: 'cancelled by the user' },
        })
      );

      expect(progress.stack).toMatchObject({ phase: 'failed', reason: 'cancelled by the user' });
      expect(statusWith).not.toHaveBeenCalled();
    });
  });

  describe('review cases', () => {
    it('shows an update run as an updated stack and a reused connector', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([
          reuseResolveStep('update'),
          stepRun('update_stack', 2, {
            output: { stack_id: STACK_ID, stack_name: 'elastic-onboarding-ab', no_changes: false },
          }),
          stackStatusStep(
            { status: 'complete', stack_status: 'UPDATE_COMPLETE' },
            'stack_status_update'
          ),
        ])
      );

      expect(progress.stack).toMatchObject({ phase: 'complete', stack_status: 'UPDATE_COMPLETE' });
      expect(progress.connector).toEqual({
        phase: 'reused',
        name: 'my-identity',
        cloud_connector_id: 'cc-1',
      });
    });

    it('reads the update poll when the update stack ran after a created stack', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([
          reuseResolveStep('update'),
          createStackStep(),
          stackComplete(),
          stepRun('update_stack', 5, {
            output: { stack_id: STACK_ID, stack_name: 'elastic-onboarding-ab', no_changes: false },
          }),
          stepRun('stack_status_update', 6, {
            output: {
              status: 'failed',
              stack_status: 'UPDATE_ROLLBACK_COMPLETE',
              reason: 'role policy too large',
            },
          }),
        ])
      );

      expect(progress.stack).toMatchObject({
        phase: 'failed',
        stack_status: 'UPDATE_ROLLBACK_COMPLETE',
        reason: 'role policy too large',
      });
    });

    it('shows a run without a stack action as a skipped stack and a reused connector', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([reuseResolveStep('none'), policiesStep()])
      );

      expect(progress.stack.phase).toBe('skipped');
      expect(progress.connector.phase).toBe('reused');
      expect(progress.policies.phase).toBe('complete');
    });

    it('reports a capped data wait as partial with the dashboard link', async () => {
      const progress = await readAwsOnboardingRunProgress(
        execution([...throughPolicies(), hasDataStep(6, noData), doneStep(7)], {
          status: 'completed',
        })
      );

      expect(progress).toMatchObject({
        status: 'completed',
        data: { phase: 'partial' },
        dashboard_path: '/app/dashboards#/view/aws',
        policies: {
          items: [
            { service: 'guardduty', has_data: true },
            { service: 'ec2', has_data: false },
          ],
        },
      });
    });
  });
});
