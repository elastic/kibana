/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

import { getAuthzFromRequest } from '../../services/security/security';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { appContextService } from '../../services/app_context';
import {
  awsOnboardingCredentialsService,
  awsOnboardingDiscoveryService,
  awsOnboardingStackService,
} from '../../services/aws_onboarding';

import { createGetAwsOnboardingStateTool } from './get_aws_onboarding_state';

jest.mock('../../services/security/security');
jest.mock('../../services/utils/agentic_aws_onboarding');
jest.mock('../../services/app_context');
jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingCredentialsService: { getPublic: jest.fn() },
  awsOnboardingDiscoveryService: { verify: jest.fn() },
  awsOnboardingStackService: { createStatusClient: jest.fn(), statusWith: jest.fn() },
}));

const getPublic = awsOnboardingCredentialsService.getPublic as jest.Mock;
const verify = awsOnboardingDiscoveryService.verify as jest.Mock;
const createStatusClient = awsOnboardingStackService.createStatusClient as jest.Mock;
const stackStatus = awsOnboardingStackService.statusWith as jest.Mock;

const request = httpServerMock.createKibanaRequest();

const step = (stepId: string, index: number, extra: Record<string, unknown> = {}) => ({
  id: `${stepId}-${index}`,
  stepId,
  globalExecutionIndex: index,
  scopeStack: [],
  ...extra,
});

const run = async (execution: unknown) => {
  const workflowApi = { getWorkflowExecution: jest.fn().mockResolvedValue(execution) } as any;
  const returned = await createGetAwsOnboardingStateTool({ workflowApi }).handler(
    { execution_id: 'exec-1' },
    { request, spaceId: 'default' } as any
  );
  return returned as unknown as { results: Array<{ data: Record<string, unknown> }> };
};

const createAttachments = (active: unknown[] = []) => ({
  getActive: jest.fn().mockReturnValue(active),
  add: jest.fn().mockResolvedValue({ id: 'att-1', current_version: 1 }),
  update: jest.fn().mockResolvedValue(undefined),
});

const runWithAttachments = async (
  execution: unknown,
  attachments: ReturnType<typeof createAttachments>
) => {
  const workflowApi = { getWorkflowExecution: jest.fn().mockResolvedValue(execution) } as any;
  const returned = await createGetAwsOnboardingStateTool({ workflowApi }).handler(
    { execution_id: 'exec-1' },
    { request, spaceId: 'default', attachments } as any
  );
  return returned as unknown as { results: Array<{ data: Record<string, unknown> }> };
};

const waitingExecution = (waitingStepId: string, stepExecutions: unknown[]) => ({
  id: 'exec-1',
  workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
  status: 'waiting_for_input',
  startedAt: '2026-11-13T00:00:00Z',
  workflowDefinition: {
    name: 'AWS Agentless Onboarding',
    steps: [{ name: waitingStepId, type: 'waitForInput', with: { message: 'Next?' } }],
  },
  stepExecutions: [...stepExecutions, step(waitingStepId, 9, { status: 'waiting_for_input' })],
});

const existingCard = (status: string) => ({
  id: 'att-9',
  type: 'fleet_aws_onboarding_credentials',
  versions: [
    {
      version: 1,
      data: { execution_id: 'exec-1', region: 'us-east-1', status },
      created_at: '2026-11-16T00:00:00Z',
      content_hash: 'hash-1',
    },
  ],
  current_version: 1,
});

describe('get_aws_onboarding_state', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(isAgenticAwsOnboardingEnabled).mockResolvedValue(true);
    getPublic.mockResolvedValue({ configured: false });
    jest
      .mocked(getAuthzFromRequest)
      .mockResolvedValue({ integrations: { readIntegrationPolicies: true } } as any);
  });

  it('returns the waiting step and the latest discover and resolve outputs for a paused run', async () => {
    const { results } = await run({
      id: 'exec-1',
      workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      status: 'waiting_for_input',
      startedAt: '2026-11-13T00:00:00Z',
      workflowDefinition: {
        name: 'AWS Agentless Onboarding',
        steps: [
          {
            name: 'approve_plan',
            type: 'waitForApproval',
            with: { message: 'Approve the integration settings?' },
          },
        ],
      },
      stepExecutions: [
        step('discover', 1, {
          status: 'completed',
          input: { region: 'us-east-1' },
          output: {
            region: 'us-west-2',
            services: [{ id: 'guardduty', name: 'GuardDuty', matched: true }],
            errors: [],
          },
        }),
        step('resolve', 2, {
          status: 'completed',
          output: {
            integrations: [{ name: 'guardduty', policyTemplates: [] }],
            policies: [
              {
                service: 'guardduty',
                name: 'aws-guardduty',
                body: { vars: { secret_access_key: 'must-not-leak' } },
              },
            ],
            permissions_summary: ['guardduty (aws-s3)'],
            suggested_identity_name: 'aws-onboarding',
            identity_name: 'my-identity',
            stack_action: 'update',
            stack_id:
              'arn:aws:cloudformation:us-west-2:123456789012:stack/elastic-onboarding-ab12/x',
            cloud_connector_id: 'cc-1',
            added_policy_templates: ['guardduty (aws-s3)'],
          },
        }),
        step('has_data', 3, {
          status: 'completed',
          output: {
            has_data: false,
            policies_with_data: ['p1'],
            policies_without_data: ['p2'],
            agents: [],
          },
        }),
        step('approve_plan', 4, { status: 'waiting_for_input' }),
      ],
    });

    const data = results[0].data;
    expect(data).toMatchObject({
      status: 'waiting_for_input',
      waiting: { step_name: 'approve_plan', message: 'Approve the integration settings?' },
      region: 'us-west-2',
      discovered_services: [{ id: 'guardduty', name: 'GuardDuty', matched: true }],
      has_data: false,
      policies_with_data: ['p1'],
      policies_without_data: ['p2'],
      resolved: {
        permissions_summary: ['guardduty (aws-s3)'],
        policies: [{ service: 'guardduty', name: 'aws-guardduty' }],
        identity_name: 'my-identity',
        stack_action: 'update',
        stack_id: 'arn:aws:cloudformation:us-west-2:123456789012:stack/elastic-onboarding-ab12/x',
        cloud_connector_id: 'cc-1',
        added_policy_templates: ['guardduty (aws-s3)'],
      },
    });
    expect(JSON.stringify(data)).not.toContain('must-not-leak');
  });

  it('returns only output and status for a completed run', async () => {
    const { results } = await run({
      id: 'exec-1',
      workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      status: 'completed',
      startedAt: '2026-11-13T00:00:00Z',
      workflowDefinition: { name: 'AWS Agentless Onboarding', steps: [] },
      stepExecutions: [
        step('discover', 1, { status: 'completed', output: { services: [], errors: [] } }),
        step('done', 2, {
          status: 'completed',
          output: { cloud_connector_id: 'cc-1', dashboard_path: '/app/dashboards#/view/x' },
        }),
      ],
    });

    expect(Object.keys(results[0].data).sort()).toEqual(['output', 'status']);
    expect(results[0].data.status).toBe('completed');
  });

  describe('credentials card', () => {
    it('creates one credentials card when the run waits at ask_credentials', async () => {
      const attachments = createAttachments();
      const { results } = await runWithAttachments(
        waitingExecution('ask_credentials', [
          step('credentials', 1, { status: 'completed', output: { configured: false } }),
        ]),
        attachments
      );

      expect(attachments.add).toHaveBeenCalledTimes(1);
      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fleet_aws_onboarding_credentials',
          data: { execution_id: 'exec-1', region: 'us-east-1', status: 'pending' },
        })
      );
      expect(results[0].data.credentials_card_attachment_id).toBe('att-1');
    });

    it('reuses the existing card for the same execution', async () => {
      const attachments = createAttachments([existingCard('pending')]);
      const { results } = await runWithAttachments(
        waitingExecution('ask_credentials', [
          step('credentials', 1, { status: 'completed', output: { configured: false } }),
        ]),
        attachments
      );

      expect(attachments.add).not.toHaveBeenCalled();
      expect(attachments.update).not.toHaveBeenCalled();
      expect(results[0].data.credentials_card_attachment_id).toBe('att-9');
    });

    it('marks the card verified once the credentials step reports working roles', async () => {
      const attachments = createAttachments([existingCard('pending')]);
      await runWithAttachments(
        waitingExecution('ask_discover', [
          step('credentials_recheck', 2, {
            status: 'completed',
            output: {
              configured: true,
              account_id: '123456789012',
              discovery_ok: true,
              provisioning_ok: true,
            },
          }),
        ]),
        attachments
      );

      expect(attachments.update).toHaveBeenCalledWith('att-9', {
        data: expect.objectContaining({ status: 'verified', account_id: '123456789012' }),
      });
    });

    it('syncs the card status but does not hand the card back at a later pause', async () => {
      const attachments = createAttachments([existingCard('pending')]);
      const { results } = await runWithAttachments(
        waitingExecution('ask_discover', [
          step('credentials_recheck', 2, {
            status: 'completed',
            output: { configured: true, discovery_ok: true, provisioning_ok: true },
          }),
        ]),
        attachments
      );

      expect(attachments.update).toHaveBeenCalledTimes(1);
      expect(results[0].data).not.toHaveProperty('credentials_card_attachment_id');
    });

    it('marks the card verify_failed with the reason when a role cannot be assumed', async () => {
      const attachments = createAttachments([existingCard('pending')]);
      await runWithAttachments(
        waitingExecution('ask_discover', [
          step('credentials_recheck', 2, {
            status: 'completed',
            output: {
              configured: true,
              discovery_ok: true,
              provisioning_ok: false,
              error: 'AccessDenied',
            },
          }),
        ]),
        attachments
      );

      expect(attachments.update).toHaveBeenCalledWith('att-9', {
        data: expect.objectContaining({ status: 'verify_failed', error: 'AccessDenied' }),
      });
    });

    it('reads the live state while waiting for credentials and marks the card verified', async () => {
      getPublic.mockResolvedValue({ configured: true, mode: 'fully-managed' });
      verify.mockResolvedValue({
        accountId: '123456789012',
        discovery: { ok: true },
        provisioning: { ok: true },
      });
      const attachments = createAttachments([existingCard('pending')]);
      const { results } = await runWithAttachments(
        waitingExecution('ask_credentials', [
          step('credentials', 1, { status: 'completed', output: { configured: false } }),
        ]),
        attachments
      );

      expect(attachments.update).toHaveBeenCalledWith('att-9', {
        data: expect.objectContaining({ status: 'verified', account_id: '123456789012' }),
      });
      expect(results[0].data.credentials_card_attachment_id).toBe('att-9');
    });

    it('marks the card verify_failed with the message when the live verification throws', async () => {
      getPublic.mockResolvedValue({ configured: true, mode: 'fully-managed' });
      verify.mockRejectedValue(new Error('AWS AccessDenied'));
      const attachments = createAttachments([existingCard('pending')]);
      await runWithAttachments(
        waitingExecution('ask_credentials', [
          step('credentials', 1, { status: 'completed', output: { configured: false } }),
        ]),
        attachments
      );

      expect(attachments.update).toHaveBeenCalledWith('att-9', {
        data: expect.objectContaining({ status: 'verify_failed', error: 'AWS AccessDenied' }),
      });
    });

    it('still returns the run state when the card cannot be created', async () => {
      const warn = jest.fn();
      jest.mocked(appContextService.getLogger).mockReturnValue({ warn } as any);
      const attachments = createAttachments();
      attachments.add.mockRejectedValue(new Error('boom'));
      const { results } = await runWithAttachments(
        waitingExecution('ask_credentials', [
          step('credentials', 1, { status: 'completed', output: { configured: false } }),
        ]),
        attachments
      );

      expect(results[0].data).toMatchObject({
        status: 'waiting_for_input',
        waiting: { step_name: 'ask_credentials' },
      });
      expect(results[0].data).not.toHaveProperty('credentials_card_attachment_id');
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('settings requirement', () => {
    const requirement = {
      package_name: 'aws',
      package_version: '8.18.1',
      region: 'us-east-1',
      services: [],
    };
    const requirementStep = () =>
      step('settings_requirement', 2, {
        status: 'completed',
        output: { ...requirement, suggested_identity_name: 'aws-1-federated-identity-ab12cd34' },
      });

    it('returns settings_requirement and suggested_identity_name at ask_plan without creating a card', async () => {
      const attachments = createAttachments();
      const { results } = await runWithAttachments(
        waitingExecution('ask_plan', [requirementStep()]),
        attachments
      );

      expect(results[0].data.settings_requirement).toEqual(requirement);
      expect(results[0].data.suggested_identity_name).toBe('aws-1-federated-identity-ab12cd34');
      expect(results[0].data.settings_card_attachment_id).toBeUndefined();
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('keeps suggested_identity_name but not settings_requirement at later pauses', async () => {
      const { results } = await runWithAttachments(
        waitingExecution('approve_plan', [requirementStep()]),
        createAttachments()
      );

      expect(results[0].data).not.toHaveProperty('settings_requirement');
      expect(results[0].data.suggested_identity_name).toBe('aws-1-federated-identity-ab12cd34');
    });
  });

  it('returns the identities the run listed for the plan', async () => {
    const identities = [
      {
        id: 'cc-1',
        name: 'existing-identity',
        created_at: '2026-11-17T10:00:00.000Z',
        updatable: false,
        not_updatable_reason: 'no_stack',
        covered_integrations: [],
        covered_policy_templates: [],
      },
    ];

    const { results } = await run(
      waitingExecution('ask_plan', [
        step('list_identities', 2, { status: 'completed', output: { identities } }),
      ])
    );

    expect(results[0].data.identities).toEqual(identities);
  });

  describe('stack progress', () => {
    const KEY = 'CREATE_IN_PROGRESS|WiiOidcProvider:CREATE_IN_PROGRESS';
    const STACK_ID = 'arn:aws:cloudformation:us-east-1:1:stack/s/1';
    const event = (resource: string, status = 'CREATE_IN_PROGRESS') => ({
      resource,
      status,
      timestamp: '2026-11-17T00:00:00Z',
    });
    const inProgress = (latestEvent = event('WiiOidcProvider')) => ({
      status: 'in_progress',
      stackStatus: 'CREATE_IN_PROGRESS',
      latestEvent,
    });
    const createStackStep = (finishedAt?: string) =>
      step('create_stack', 3, {
        status: 'completed',
        output: { stack_id: STACK_ID },
        ...(finishedAt && { finishedAt }),
      });
    const runningExecution = (stepExecutions: unknown[] = [createStackStep()]) => ({
      id: 'exec-1',
      workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      status: 'running',
      startedAt: '2026-11-13T00:00:00Z',
      workflowDefinition: { name: 'AWS Agentless Onboarding', steps: [] },
      stepExecutions,
    });
    const logger = { warn: jest.fn() };
    let getWorkflowExecution: jest.Mock;

    beforeEach(() => {
      jest.mocked(appContextService.getLogger).mockReturnValue(logger as any);
      createStatusClient.mockResolvedValue({ client: 'session' });
    });

    const runWait = async (
      executions: unknown[],
      waitForChangeSince?: string,
      stackHandOverMs?: number
    ): Promise<Record<string, any>> => {
      getWorkflowExecution = jest.fn();
      executions.forEach((e, i) =>
        i === executions.length - 1
          ? getWorkflowExecution.mockResolvedValue(e)
          : getWorkflowExecution.mockResolvedValueOnce(e)
      );
      const returned = (await createGetAwsOnboardingStateTool({
        workflowApi: { getWorkflowExecution } as any,
        waitIntervalMs: 1,
        waitTimeoutMs: 20,
        ...(stackHandOverMs !== undefined && { stackHandOverMs }),
      }).handler(
        {
          execution_id: 'exec-1',
          ...(waitForChangeSince !== undefined && { wait_for_change_since: waitForChangeSince }),
        },
        { request, spaceId: 'default' } as any
      )) as unknown as { results: Array<{ data: Record<string, unknown> }> };
      return returned.results[0].data;
    };

    it('reads the stack live while the run is creating it and returns a progress key', async () => {
      stackStatus.mockResolvedValue(inProgress());

      const data = await runWait([runningExecution()]);

      expect(stackStatus).toHaveBeenCalledTimes(1);
      expect(data.stack).toEqual({
        stack_id: STACK_ID,
        status: 'in_progress',
        stack_status: 'CREATE_IN_PROGRESS',
        latest_event: event('WiiOidcProvider'),
        progress_key: KEY,
      });
    });

    it('does not read the stack live once the run has completed', async () => {
      await runWait([{ ...runningExecution(), status: 'completed' }]);

      expect(createStatusClient).not.toHaveBeenCalled();
      expect(stackStatus).not.toHaveBeenCalled();
    });

    it('uses the engine output without a live read when there is no create_stack output', async () => {
      const data = await runWait([
        runningExecution([
          step('stack_status', 4, {
            status: 'completed',
            output: { status: 'in_progress', stack_status: 'CREATE_IN_PROGRESS' },
          }),
        ]),
      ]);

      expect(stackStatus).not.toHaveBeenCalled();
      expect((data.stack as any).progress_key).toBe('CREATE_IN_PROGRESS|:');
    });

    it('falls back to the engine output when the live read throws', async () => {
      stackStatus.mockRejectedValue(new Error('throttled'));

      const data = await runWait([
        runningExecution([
          createStackStep(),
          step('stack_status', 4, {
            status: 'completed',
            output: { status: 'in_progress', stack_status: 'CREATE_IN_PROGRESS' },
          }),
        ]),
      ]);

      expect((data.stack as any).status).toBe('in_progress');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('throttled'));
    });

    it('keeps reading live while the engine sits in its timer wait and returns on a key change', async () => {
      stackStatus
        .mockResolvedValueOnce(inProgress())
        .mockResolvedValue(inProgress(event('WiiRole')));
      const timerWait = {
        ...runningExecution([createStackStep(), step('stack_wait', 5, { status: 'waiting' })]),
        status: 'waiting',
      };

      const data = await runWait([timerWait], KEY);

      expect((data.stack as any).progress_key).toBe(
        'CREATE_IN_PROGRESS|WiiRole:CREATE_IN_PROGRESS'
      );
      expect((data.stack as any).timed_out).toBeUndefined();
      expect(stackStatus).toHaveBeenCalledTimes(2);
    });

    it('waits for the stack to appear when called with an empty key before create_stack', async () => {
      stackStatus.mockResolvedValue(inProgress());

      const data = await runWait([runningExecution([]), runningExecution()], '');

      expect((data.stack as any).progress_key).toBe(KEY);
      expect((data.stack as any).timed_out).toBeUndefined();
      expect(getWorkflowExecution).toHaveBeenCalledTimes(2);
    });

    it('ends the wait when a step pauses for input even though the key is unchanged', async () => {
      stackStatus.mockResolvedValue(inProgress());
      const paused = runningExecution([
        createStackStep(),
        step('approve_plan', 9, { status: 'waiting_for_input' }),
      ]);

      const data = await runWait([runningExecution(), paused], KEY);

      expect((data.stack as any).progress_key).toBe(KEY);
      expect((data.stack as any).timed_out).toBeUndefined();
      expect(getWorkflowExecution).toHaveBeenCalledTimes(2);
    });

    it('returns timed_out with the same key after a quiet wait, on one provisioning session', async () => {
      stackStatus.mockResolvedValue(inProgress());

      const data = await runWait([runningExecution()], KEY);

      expect((data.stack as any).timed_out).toBe(true);
      expect((data.stack as any).progress_key).toBe(KEY);
      expect(stackStatus.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(stackStatus.mock.calls.length).toBeLessThan(40);
      expect(createStatusClient).toHaveBeenCalledTimes(1);
      expect(stackStatus).toHaveBeenCalledWith({ client: 'session' }, STACK_ID);
    });

    it('keeps the previous stack block when a live read fails mid-wait and warns once', async () => {
      stackStatus.mockResolvedValueOnce(inProgress()).mockRejectedValue(new Error('throttled'));
      const withEngineOutput = runningExecution([
        createStackStep(),
        step('stack_status', 4, {
          status: 'completed',
          output: { status: 'in_progress', stack_status: 'CREATE_IN_PROGRESS' },
        }),
      ]);

      const data = await runWait([withEngineOutput], KEY);

      expect((data.stack as any).progress_key).toBe(KEY);
      expect((data.stack as any).timed_out).toBe(true);
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('hands over without waiting once the stack has been in progress past the threshold', async () => {
      stackStatus.mockResolvedValue(inProgress());
      const finishedAt = new Date(Date.now() - 60_000).toISOString();

      const data = await runWait([runningExecution([createStackStep(finishedAt)])], KEY, 30_000);

      expect((data.stack as any).hand_over).toBe(true);
      expect(getWorkflowExecution).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['the stack is complete', { status: 'complete', stackStatus: 'CREATE_COMPLETE' }, 30_000],
      ['the threshold has not passed', inProgress(), 120_000],
    ])('does not hand over when %s', async (_name, live, threshold) => {
      stackStatus.mockResolvedValue(live);
      const finishedAt = new Date(Date.now() - 60_000).toISOString();

      const data = await runWait(
        [runningExecution([createStackStep(finishedAt)])],
        undefined,
        threshold
      );

      expect(data.stack).not.toHaveProperty('hand_over');
    });
  });
});
