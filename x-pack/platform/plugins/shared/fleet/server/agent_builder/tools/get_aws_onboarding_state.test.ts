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
} from '../../services/aws_onboarding';
import { awsOnboardingStackService } from '../../services/aws_onboarding/stacks';

import { createGetAwsOnboardingStateTool } from './get_aws_onboarding_state';

jest.mock('../../services/security/security');
jest.mock('../../services/utils/agentic_aws_onboarding');
jest.mock('../../services/app_context');
jest.mock('../../services/aws_onboarding', () => ({
  ...jest.requireActual('../../services/aws_onboarding/run_progress'),
  awsOnboardingCredentialsService: { getPublic: jest.fn() },
  awsOnboardingDiscoveryService: { verify: jest.fn() },
}));
jest.mock('../../services/aws_onboarding/stacks', () => ({
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

  describe('stack', () => {
    const STACK_ID = 'arn:aws:cloudformation:us-east-1:1:stack/s/1';
    const resource = (logicalId: string, status = 'CREATE_IN_PROGRESS') => ({
      logicalId,
      status,
      updatedAt: '2026-11-17T00:00:00Z',
    });
    const runningExecution = (stepExecutions: unknown[]) => ({
      id: 'exec-1',
      workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      status: 'running',
      startedAt: '2026-11-13T00:00:00Z',
      workflowDefinition: { name: 'AWS Agentless Onboarding', steps: [] },
      stepExecutions,
    });
    const createStackStep = () =>
      step('create_stack', 3, {
        status: 'completed',
        output: { stack_id: STACK_ID, stack_name: 's' },
      });

    beforeEach(() => {
      jest.mocked(appContextService.getLogger).mockReturnValue({ warn: jest.fn() } as any);
      createStatusClient.mockResolvedValue({ client: 'session' });
    });

    it('reads the stack live while the run is creating it, with its newest resource', async () => {
      stackStatus.mockResolvedValue({
        status: 'in_progress',
        stackStatus: 'CREATE_IN_PROGRESS',
        resources: [resource('WiiOidcProvider', 'CREATE_COMPLETE'), resource('WiiRole')],
      });

      const { results } = await run(runningExecution([createStackStep()]));

      expect(stackStatus).toHaveBeenCalledTimes(1);
      expect(results[0].data.stack).toEqual({
        action: 'create',
        stack_id: STACK_ID,
        stack_name: 's',
        status: 'in_progress',
        stack_status: 'CREATE_IN_PROGRESS',
        latest_event: resource('WiiRole'),
      });
    });

    it("reads the reused identity's stack live while the run is updating it", async () => {
      stackStatus.mockResolvedValue({
        status: 'in_progress',
        stackStatus: 'UPDATE_IN_PROGRESS',
        resources: [],
      });

      const { results } = await run(
        runningExecution([
          step('update_stack', 3, {
            status: 'completed',
            output: { stack_id: STACK_ID, stack_name: 's', no_changes: false },
          }),
        ])
      );

      expect(stackStatus).toHaveBeenCalledWith({ client: 'session' }, STACK_ID);
      expect(results[0].data.stack).toEqual(
        expect.objectContaining({ action: 'update', stack_status: 'UPDATE_IN_PROGRESS' })
      );
    });

    it('returns the finished stack from the step outputs without a live read or role ARN', async () => {
      const { results } = await run(
        runningExecution([
          createStackStep(),
          step('stack_status', 4, {
            status: 'completed',
            output: {
              status: 'complete',
              stack_status: 'CREATE_COMPLETE',
              role_arn: 'arn:aws:iam::1:role/r',
            },
          }),
        ])
      );

      expect(createStatusClient).not.toHaveBeenCalled();
      expect(results[0].data.stack).toEqual({
        action: 'create',
        stack_id: STACK_ID,
        stack_name: 's',
        status: 'complete',
        stack_status: 'CREATE_COMPLETE',
      });
    });
  });

  describe('stack card', () => {
    const STACK_ID = 'arn:aws:cloudformation:eu-west-1:123456789012:stack/elastic-onboarding-ab/1';
    const updatingExecution = {
      id: 'exec-1',
      workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      status: 'running',
      startedAt: '2026-11-18T09:58:00Z',
      workflowDefinition: { name: 'AWS Agentless Onboarding', steps: [] },
      stepExecutions: [
        step('settings_requirement', 1, {
          status: 'completed',
          output: { services: [{ id: 'guardduty', name: 'Amazon GuardDuty' }] },
        }),
        step('resolve', 2, {
          status: 'completed',
          output: {
            policies: [{ service: 'guardduty', name: 'aws-guardduty' }],
            added_policy_templates: ['guardduty'],
          },
        }),
        step('update_stack', 3, {
          status: 'completed',
          output: { stack_id: STACK_ID, stack_name: 'elastic-onboarding-ab' },
          finishedAt: '2026-11-18T10:00:00Z',
        }),
      ],
    };

    beforeEach(() => {
      createStatusClient.mockResolvedValue({ client: 'session' });
      stackStatus.mockResolvedValue({
        status: 'in_progress',
        stackStatus: 'UPDATE_IN_PROGRESS',
        resources: [],
      });
    });

    it('creates the stack card from the stack step once the run has a stack', async () => {
      const attachments = createAttachments();

      const { results } = await runWithAttachments(updatingExecution, attachments);

      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fleet_aws_onboarding_stack',
          data: {
            execution_id: 'exec-1',
            stack_id: STACK_ID,
            stack_name: 'elastic-onboarding-ab',
            region: 'eu-west-1',
            action: 'update',
            for_services: ['Amazon GuardDuty'],
            adding: ['guardduty'],
            started_at: '2026-11-18T10:00:00Z',
          },
        })
      );
      expect(results[0].data.stack_card_attachment_id).toBe('att-1');
    });

    it('returns the existing stack card on a later call without creating another', async () => {
      const attachments = createAttachments([
        {
          id: 'att-7',
          type: 'fleet_aws_onboarding_stack',
          versions: [
            {
              version: 1,
              data: { execution_id: 'exec-1', stack_id: STACK_ID },
              created_at: '2026-11-18T10:00:01Z',
              content_hash: 'hash-7',
            },
          ],
          current_version: 1,
        },
      ]);

      const { results } = await runWithAttachments(updatingExecution, attachments);

      expect(attachments.add).not.toHaveBeenCalled();
      expect(results[0].data.stack_card_attachment_id).toBe('att-7');
    });
  });
});
