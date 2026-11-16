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

import { createGetAwsOnboardingStateTool } from './get_aws_onboarding_state';

jest.mock('../../services/security/security');
jest.mock('../../services/utils/agentic_aws_onboarding');
jest.mock('../../services/app_context');
jest.mock('../../services/aws_onboarding', () => ({
  awsOnboardingCredentialsService: { getPublic: jest.fn() },
  awsOnboardingDiscoveryService: { verify: jest.fn() },
}));

const getPublic = awsOnboardingCredentialsService.getPublic as jest.Mock;
const verify = awsOnboardingDiscoveryService.verify as jest.Mock;

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
            name: 'approve_values',
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
        step('approve_values', 4, { status: 'waiting_for_input' }),
      ],
    });

    const data = results[0].data;
    expect(data).toMatchObject({
      status: 'waiting_for_input',
      waiting: { step_name: 'approve_values', message: 'Approve the integration settings?' },
      region: 'us-west-2',
      discovered_services: [{ id: 'guardduty', name: 'GuardDuty', matched: true }],
      has_data: false,
      policies_with_data: ['p1'],
      policies_without_data: ['p2'],
      resolved: {
        permissions_summary: ['guardduty (aws-s3)'],
        policies: [{ service: 'guardduty', name: 'aws-guardduty' }],
        suggested_identity_name: 'aws-onboarding',
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

  describe('settings card', () => {
    const requirement = {
      package_name: 'aws',
      package_version: '8.18.1',
      region: 'us-east-1',
      services: [],
    };
    const requirementStep = () =>
      step('settings_requirement', 2, { status: 'completed', output: requirement });

    it('returns settings_requirement and creates the settings card at ask_settings', async () => {
      const attachments = createAttachments();
      const { results } = await runWithAttachments(
        waitingExecution('ask_settings', [requirementStep()]),
        attachments
      );

      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fleet_aws_onboarding_settings',
          data: { execution_id: 'exec-1', requirement },
        })
      );
      expect(results[0].data.settings_card_attachment_id).toBe('att-1');
      expect(results[0].data.settings_requirement).toEqual(requirement);
    });

    it('does not return the settings card id at other pauses', async () => {
      const attachments = createAttachments([
        {
          id: 'att-5',
          type: 'fleet_aws_onboarding_settings',
          versions: [{ version: 1, data: { execution_id: 'exec-1', requirement } }],
          current_version: 1,
        },
      ]);
      const { results } = await runWithAttachments(
        waitingExecution('ask_resolve', [requirementStep()]),
        attachments
      );

      expect(results[0].data).not.toHaveProperty('settings_card_attachment_id');
      expect(results[0].data).not.toHaveProperty('settings_requirement');
    });
  });
});
