/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { startKiIdentificationToolHandler } from './handler';
import { OnboardingStep } from '@kbn/streams-schema';

describe('startKiIdentificationToolHandler', () => {
  const setup = () => {
    const workflowsManagementApi = {
      getWorkflow: jest.fn().mockResolvedValue({
        id: '.streams-ki-onboarding',
        name: 'onboarding',
        enabled: true,
        definition: {},
        yaml: '',
      }),
      runWorkflow: jest.fn().mockResolvedValue('exec-1'),
      getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [] }),
      cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };

    return {
      workflowsManagementApi,
      request: httpServerMock.createKibanaRequest(),
    };
  };

  it('runs workflow and returns tracking Kibana path', async () => {
    const { workflowsManagementApi, request } = setup();

    const result = await startKiIdentificationToolHandler({
      streamName: 'logs.nginx',
      steps: [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration],
      workflowsManagementApi: workflowsManagementApi as never,
      request,
    });

    expect(result).toEqual({
      kibanaPath: '/app/streams/logs.nginx/management/significantEvents',
    });

    expect(workflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '.streams-ki-onboarding',
      }),
      'default',
      expect.objectContaining({ streamName: 'logs.nginx' }),
      expect.anything()
    );
  });
});
