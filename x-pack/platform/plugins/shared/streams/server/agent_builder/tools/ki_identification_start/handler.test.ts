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
    const taskClient = {
      schedule: jest.fn().mockResolvedValue(undefined),
    };

    return {
      taskClient,
      request: httpServerMock.createKibanaRequest(),
    };
  };

  it('schedules task and returns tracking Kibana path', async () => {
    const { taskClient, request } = setup();

    const result = await startKiIdentificationToolHandler({
      streamName: 'logs.nginx',
      steps: [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration],
      taskClient: taskClient as never,
      request,
    });

    expect(result).toEqual({
      kibanaPath: '/app/streams/logs.nginx/management/significantEvents',
    });

    expect(taskClient.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        task: {
          type: 'streams_onboarding',
          id: 'streams_onboarding_logs.nginx',
          space: '*',
        },
      })
    );
  });
});
