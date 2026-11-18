/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { executeWorkflow } from '@kbn/agent-builder-tools-base/workflows';
import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

import { getAuthzFromRequest } from '../../services/security/security';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { createStartAwsOnboardingTool } from './start_aws_onboarding';

jest.mock('@kbn/agent-builder-tools-base/workflows');
jest.mock('../../services/security/security');
jest.mock('../../services/utils/agentic_aws_onboarding');

const workflowApi = {} as any;
const request = httpServerMock.createKibanaRequest();

const run = (params: { region: string; namespace?: string; services?: string[] }) =>
  createStartAwsOnboardingTool({ workflowApi }).handler(params, {
    request,
    spaceId: 'default',
  } as any) as Promise<{ results: Array<{ type: string; data: Record<string, unknown> }> }>;

describe('start_aws_onboarding', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(isAgenticAwsOnboardingEnabled).mockResolvedValue(true);
    jest
      .mocked(getAuthzFromRequest)
      .mockResolvedValue({ integrations: { writeIntegrationPolicies: true } } as any);
  });

  it('returns an error result and does not start a run when the feature flag is off', async () => {
    jest.mocked(isAgenticAwsOnboardingEnabled).mockResolvedValue(false);

    const { results } = await run({ region: 'us-east-1' });

    expect(results[0].type).toBe('error');
    expect(executeWorkflow).not.toHaveBeenCalled();
  });

  it('returns an error result when the user lacks Fleet write privileges', async () => {
    jest
      .mocked(getAuthzFromRequest)
      .mockResolvedValue({ integrations: { writeIntegrationPolicies: false } } as any);

    const { results } = await run({ region: 'us-east-1' });

    expect(results[0].type).toBe('error');
    expect(executeWorkflow).not.toHaveBeenCalled();
  });

  it('starts the managed workflow without waiting and returns the execution id', async () => {
    jest.mocked(executeWorkflow).mockResolvedValue({
      success: true,
      execution: { execution_id: 'exec-1', workflow_id: 'wf-1' },
    } as any);

    const { results } = await run({ region: 'us-east-1', namespace: 'prod' });

    expect(executeWorkflow).toHaveBeenCalledWith({
      workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      workflowParams: { region: 'us-east-1', namespace: 'prod' },
      request,
      spaceId: 'default',
      workflowApi,
      waitForCompletion: false,
    });
    expect(results[0].data).toEqual({ execution_id: 'exec-1', workflow_id: 'wf-1' });
  });

  it('passes the known services to the run so it skips discovery', async () => {
    jest.mocked(executeWorkflow).mockResolvedValue({
      success: true,
      execution: { execution_id: 'exec-1', workflow_id: 'wf-1' },
    } as any);

    await run({ region: 'us-east-1', services: ['guardduty'] });

    expect(executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowParams: { region: 'us-east-1', services: ['guardduty'] },
      })
    );
  });
});
