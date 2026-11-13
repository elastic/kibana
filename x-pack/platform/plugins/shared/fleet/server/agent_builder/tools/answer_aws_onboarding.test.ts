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

import { createAnswerAwsOnboardingTool } from './answer_aws_onboarding';

jest.mock('../../services/security/security');
jest.mock('../../services/utils/agentic_aws_onboarding');

const request = httpServerMock.createKibanaRequest();

describe('answer_aws_onboarding', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(isAgenticAwsOnboardingEnabled).mockResolvedValue(true);
    jest
      .mocked(getAuthzFromRequest)
      .mockResolvedValue({ integrations: { writeIntegrationPolicies: true } } as any);
  });

  it('resumes the execution with the given answer and returns the new status', async () => {
    const workflowApi = {
      resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'user' }),
      getWorkflowExecution: jest.fn().mockResolvedValue({
        status: 'running',
        workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      }),
    } as any;

    const returned = await createAnswerAwsOnboardingTool({ workflowApi }).handler(
      { execution_id: 'exec-1', answer: { approved: true } },
      { request, spaceId: 'default' } as any
    );
    const { results } = returned as unknown as {
      results: Array<{ data: Record<string, unknown> }>;
    };

    expect(workflowApi.resumeWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      { approved: true },
      request
    );
    expect(results[0].data).toEqual({ status: 'running' });
  });

  it('returns an error result and does not resume when the execution belongs to another workflow', async () => {
    const workflowApi = {
      resumeWorkflowExecution: jest.fn(),
      getWorkflowExecution: jest
        .fn()
        .mockResolvedValue({ status: 'waiting_for_input', workflowId: 'some-other-workflow' }),
    } as any;

    const returned = await createAnswerAwsOnboardingTool({ workflowApi }).handler(
      { execution_id: 'exec-2', answer: { approved: true } },
      { request, spaceId: 'default' } as any
    );
    const { results } = returned as unknown as { results: Array<{ type: string }> };

    expect(results[0].type).toBe('error');
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });
});
