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

import { createGetAwsOnboardingStateTool } from './get_aws_onboarding_state';

jest.mock('../../services/security/security');
jest.mock('../../services/utils/agentic_aws_onboarding');

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

describe('get_aws_onboarding_state', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(isAgenticAwsOnboardingEnabled).mockResolvedValue(true);
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
          output: { services: [{ id: 'guardduty', name: 'GuardDuty', matched: true }], errors: [] },
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
            suggested_identity_name: 'aws-onboarding',
          },
        }),
        step('approve_values', 3, { status: 'waiting_for_input' }),
      ],
    });

    const data = results[0].data;
    expect(data).toMatchObject({
      status: 'waiting_for_input',
      waiting: { step_name: 'approve_values', message: 'Approve the integration settings?' },
      discovered_services: [{ id: 'guardduty', name: 'GuardDuty', matched: true }],
      resolved: {
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
});
