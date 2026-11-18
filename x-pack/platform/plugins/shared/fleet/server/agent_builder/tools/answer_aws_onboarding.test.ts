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
        workflowDefinition: { name: 'AWS Agentless Onboarding', steps: [] },
        stepExecutions: [
          { id: 'step-exec-1', stepId: 'approve_plan', status: 'waiting_for_input' },
        ],
      }),
    } as any;

    const returned = await createAnswerAwsOnboardingTool({ workflowApi }).handler(
      { execution_id: 'exec-1', step_name: 'approve_plan', answer: { approved: true } },
      { request, spaceId: 'default' } as any
    );
    const { results } = returned as unknown as {
      results: Array<{ data: Record<string, unknown> }>;
    };

    expect(workflowApi.resumeWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      { approved: true },
      request,
      { stepExecutionId: 'step-exec-1' }
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
      { execution_id: 'exec-2', step_name: 'approve_plan', answer: { approved: true } },
      { request, spaceId: 'default' } as any
    );
    const { results } = returned as unknown as { results: Array<{ type: string }> };

    expect(results[0].type).toBe('error');
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('returns an error result and does not resume when the waiting step is not the one answered', async () => {
    const workflowApi = {
      resumeWorkflowExecution: jest.fn(),
      getWorkflowExecution: jest.fn().mockResolvedValue({
        status: 'waiting_for_input',
        workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
        stepExecutions: [
          { id: 'step-exec-1', stepId: 'ask_discover', status: 'completed' },
          { id: 'step-exec-2', stepId: 'select_services', status: 'waiting_for_input' },
        ],
      }),
    } as any;

    const returned = await createAnswerAwsOnboardingTool({ workflowApi }).handler(
      { execution_id: 'exec-3', step_name: 'ask_discover', answer: { approved: true } },
      { request, spaceId: 'default' } as any
    );
    const { results } = returned as unknown as { results: Array<{ type: string; data: any }> };

    expect(results[0].type).toBe('error');
    expect(JSON.stringify(results[0])).toContain('select_services');
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  describe('settling after the resume', () => {
    const definition = {
      name: 'AWS Agentless Onboarding',
      steps: [
        { name: 'ask_credentials', type: 'waitForInput', with: { message: 'Credentials?' } },
        { name: 'ask_discover', type: 'waitForInput', with: { message: 'Discover now?' } },
      ],
    };
    const waitingOn = (stepId: string, id: string) => ({
      id,
      stepId,
      globalExecutionIndex: 1,
      scopeStack: [],
      status: 'waiting_for_input',
    });
    const execution = (stepExecutions: unknown[]) => ({
      status: 'waiting_for_input',
      workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      workflowDefinition: definition,
      stepExecutions,
    });
    const answer = (workflowApi: unknown, timeoutMs: number) =>
      createAnswerAwsOnboardingTool({
        workflowApi: workflowApi as any,
        settleIntervalMs: 0,
        settleTimeoutMs: timeoutMs,
      }).handler({ execution_id: 'exec-1', step_name: 'ask_credentials', answer: { done: true } }, {
        request,
        spaceId: 'default',
      } as any) as unknown as Promise<{ results: Array<{ data: Record<string, any> }> }>;

    it('polls until the answered step completes and returns the next pause', async () => {
      const first = execution([waitingOn('ask_credentials', 'se-1')]);
      const settled = execution([
        { ...waitingOn('ask_credentials', 'se-1'), status: 'completed' },
        { ...waitingOn('ask_discover', 'se-2'), globalExecutionIndex: 2 },
      ]);
      const workflowApi = {
        resumeWorkflowExecution: jest.fn().mockResolvedValue({}),
        getWorkflowExecution: jest
          .fn()
          .mockResolvedValueOnce(first)
          .mockResolvedValueOnce(first)
          .mockResolvedValueOnce(settled),
      };

      const { results } = await answer(workflowApi, 5000);

      expect(workflowApi.getWorkflowExecution).toHaveBeenCalledTimes(3);
      expect(results[0].data.waiting).toEqual(
        expect.objectContaining({ step_name: 'ask_discover', message: 'Discover now?' })
      );
      expect(results[0].data).not.toHaveProperty('settling');
    });

    it('reports settling with the last-seen pause when the engine has not moved by the bound', async () => {
      const stuck = execution([waitingOn('ask_credentials', 'se-1')]);
      const workflowApi = {
        resumeWorkflowExecution: jest.fn().mockResolvedValue({}),
        getWorkflowExecution: jest.fn().mockResolvedValue(stuck),
      };

      const { results } = await answer(workflowApi, 20);

      expect(results[0].data.settling).toBe(true);
      expect(results[0].data.waiting.step_name).toBe('ask_credentials');
    });
  });

  describe('the plan pause', () => {
    const requirement = {
      package_name: 'aws',
      package_version: '8.18.1',
      region: 'us-east-1',
      services: [
        {
          id: 'guardduty',
          name: 'GuardDuty',
          policy_template: 'guardduty',
          data_streams: [
            {
              id: 'guardduty',
              dataset: 'aws.guardduty',
              type: 'logs',
              title: 'GuardDuty findings',
              choice: 'one_of',
              inputs: [
                {
                  input: 'httpjson',
                  ingestion_method: 'API',
                  title: 'GuardDuty API',
                  description: 'Poll the API',
                  fields: [
                    { name: 'detector_id', title: 'Detector ID', type: 'text', required: true },
                  ],
                  var_groups: [],
                },
              ],
            },
          ],
        },
      ],
    };
    const services = { guardduty: { data_streams: { guardduty: { input: 'httpjson' } } } };
    const answerPlan = async (answer: Record<string, unknown>) => {
      const workflowApi = {
        resumeWorkflowExecution: jest.fn(),
        getWorkflowExecution: jest.fn().mockResolvedValue({
          status: 'waiting_for_input',
          workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
          stepExecutions: [
            {
              id: 'se-req',
              stepId: 'settings_requirement',
              globalExecutionIndex: 1,
              status: 'completed',
              output: requirement,
            },
            {
              id: 'se-1',
              stepId: 'ask_plan',
              globalExecutionIndex: 2,
              status: 'waiting_for_input',
            },
          ],
        }),
      } as any;
      const returned = await createAnswerAwsOnboardingTool({ workflowApi }).handler(
        { execution_id: 'exec-1', step_name: 'ask_plan', answer },
        { request, spaceId: 'default' } as any
      );
      const { results } = returned as unknown as {
        results: Array<{ type: string; data: any }>;
      };
      return { results, workflowApi };
    };

    it('returns invalid with problems and does not resume', async () => {
      const { results, workflowApi } = await answerPlan({
        services,
        identity: { name: 'my-identity' },
      });

      expect(results[0].data.status).toBe('invalid');
      expect(results[0].data.problems[0].path).toBe('guardduty.guardduty.vars.detector_id');
      expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('returns an error naming identity when the plan has no identity', async () => {
      const { results, workflowApi } = await answerPlan({ services });

      expect(results[0].type).toBe('error');
      expect(JSON.stringify(results[0])).toContain('identity');
      expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('returns an error for an empty policy name', async () => {
      const { results, workflowApi } = await answerPlan({
        services,
        policy_names: { x: '' },
        identity: { name: 'my-identity' },
      });

      expect(results[0].type).toBe('error');
      expect(JSON.stringify(results[0])).toContain('policy_names');
      expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
    });
  });
});
