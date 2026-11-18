/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

import type { AwsOnboardingSettingsRequirement } from '../../../common/workflows/steps/settings';

import { submitPlanAnswer } from './settings_answer';

const request = httpServerMock.createKibanaRequest();

const requirement: AwsOnboardingSettingsRequirement = {
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
                {
                  name: 'detector_id',
                  title: 'Detector ID',
                  type: 'text',
                  required: true,
                  advanced: false,
                },
              ],
              var_groups: [],
            },
          ],
        },
      ],
    },
  ],
};

const identity = { name: 'my-identity' };
const validPlan = {
  services: {
    guardduty: { data_streams: { guardduty: { input: 'httpjson', vars: { detector_id: 'd-1' } } } },
  },
  policy_names: { guardduty: 'my-guardduty' },
  identity,
};
const invalidSettingsPlan = {
  services: { guardduty: { data_streams: { guardduty: { input: 'httpjson' } } } },
  identity,
};

const execution = (waitingStepId: string) => ({
  workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
  status: 'waiting_for_input',
  stepExecutions: [
    {
      id: 'se-req',
      stepId: 'settings_requirement',
      globalExecutionIndex: 1,
      status: 'completed',
      output: requirement,
    },
    { id: 'se-wait', stepId: waitingStepId, globalExecutionIndex: 2, status: 'waiting_for_input' },
  ],
});

const setup = (waitingStepId = 'ask_plan') => {
  const workflowApi = {
    getWorkflowExecution: jest.fn().mockResolvedValue(execution(waitingStepId)),
    resumeWorkflowExecution: jest.fn().mockResolvedValue({}),
  } as any;
  return { workflowApi };
};

const base = { executionId: 'exec-1', spaceId: 'default', request };

describe('submitPlanAnswer', () => {
  it('resumes with the whole plan when it is valid', async () => {
    const { workflowApi } = setup();
    const result = await submitPlanAnswer({ ...base, workflowApi, answer: validPlan });
    expect(result).toEqual({ status: 'resumed' });
    expect(workflowApi.resumeWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      validPlan,
      request,
      { stepExecutionId: 'se-wait' }
    );
  });

  it('returns invalid with the settings problems and does not resume', async () => {
    const { workflowApi } = setup();
    const result = await submitPlanAnswer({ ...base, workflowApi, answer: invalidSettingsPlan });
    expect(result.status).toBe('invalid');
    expect(result.problems?.[0].path).toBe('guardduty.guardduty.vars.detector_id');
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('returns invalid for a policy name of a service the plan does not include', async () => {
    const { workflowApi } = setup();
    const result = await submitPlanAnswer({
      ...base,
      workflowApi,
      answer: { ...validPlan, policy_names: { ec2: 'my-ec2' } },
    });
    expect(result).toEqual({
      status: 'invalid',
      problems: [{ path: 'policy_names.ec2', message: 'Unknown service "ec2".' }],
    });
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('returns invalid for a policy name inherited from Object rather than a planned service', async () => {
    const { workflowApi } = setup();
    const result = await submitPlanAnswer({
      ...base,
      workflowApi,
      answer: { ...validPlan, policy_names: { toString: 'my-policy' } },
    });
    expect(result.problems).toEqual([
      { path: 'policy_names.toString', message: 'Unknown service "toString".' },
    ]);
  });

  it('returns invalid when two services are given the same policy name', async () => {
    const { workflowApi } = setup();
    const result = await submitPlanAnswer({
      ...base,
      workflowApi,
      answer: {
        ...validPlan,
        services: { ...validPlan.services, ec2: validPlan.services.guardduty },
        policy_names: { guardduty: 'shared-name', ec2: 'shared-name' },
      },
    });
    expect(result.problems).toEqual(
      expect.arrayContaining([
        { path: 'policy_names.ec2', message: 'Duplicate policy name "shared-name".' },
      ])
    );
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('refuses when the run is not waiting at ask_plan', async () => {
    const { workflowApi } = setup('approve_plan');
    await expect(submitPlanAnswer({ ...base, workflowApi, answer: validPlan })).rejects.toThrow(
      /ask_plan/
    );
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });
});
