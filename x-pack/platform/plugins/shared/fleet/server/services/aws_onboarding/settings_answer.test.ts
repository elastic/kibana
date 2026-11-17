/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

import type { AwsOnboardingSettingsRequirement } from '../../../common/workflows/steps/settings';

import { submitSettingsAnswer } from './settings_answer';

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

const validAnswer = {
  services: {
    guardduty: { data_streams: { guardduty: { input: 'httpjson', vars: { detector_id: 'd-1' } } } },
  },
};
const invalidAnswer = {
  services: { guardduty: { data_streams: { guardduty: { input: 'httpjson' } } } },
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

const setup = (waitingStepId = 'ask_settings') => {
  const workflowApi = {
    getWorkflowExecution: jest.fn().mockResolvedValue(execution(waitingStepId)),
    resumeWorkflowExecution: jest.fn().mockResolvedValue({}),
  } as any;
  const card = {
    id: 'att-1',
    type: 'fleet_aws_onboarding_settings',
    versions: [{ version: 1, data: { execution_id: 'exec-1', requirement } }],
    current_version: 1,
  };
  const attachments = {
    getActive: jest.fn().mockReturnValue([card]),
    add: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  } as any;
  return { workflowApi, attachments };
};

const base = { executionId: 'exec-1', spaceId: 'default', request };

describe('submitSettingsAnswer', () => {
  it('resumes when the answer is valid', async () => {
    const { workflowApi } = setup();
    const result = await submitSettingsAnswer({ ...base, workflowApi, answer: validAnswer });
    expect(result).toEqual({ status: 'resumed' });
    expect(workflowApi.resumeWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      validAnswer,
      request,
      { stepExecutionId: 'se-wait' }
    );
  });

  it('returns invalid with problems and does not resume', async () => {
    const { workflowApi } = setup();
    const result = await submitSettingsAnswer({ ...base, workflowApi, answer: invalidAnswer });
    expect(result.status).toBe('invalid');
    expect(result.problems?.[0].path).toBe('guardduty.guardduty.vars.detector_id');
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('records the attempt on the attachment', async () => {
    const { workflowApi, attachments } = setup();
    const { problems } = await submitSettingsAnswer({
      ...base,
      workflowApi,
      answer: invalidAnswer,
      attachments,
    });
    expect(attachments.update).toHaveBeenCalledWith('att-1', {
      data: { execution_id: 'exec-1', requirement, answer: invalidAnswer, problems },
    });
  });

  it('refuses when the run is not waiting at ask_settings', async () => {
    const { workflowApi } = setup('ask_stack');
    await expect(
      submitSettingsAnswer({ ...base, workflowApi, answer: validAnswer })
    ).rejects.toThrow(/ask_settings/);
    expect(workflowApi.resumeWorkflowExecution).not.toHaveBeenCalled();
  });
});
