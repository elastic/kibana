/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKiIdentificationStartTool } from './tool';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';
import { OnboardingStep } from '@kbn/streams-schema';

describe('createKiIdentificationStartTool', () => {
  const telemetry = {
    trackAgentToolKiIdentificationStarted: jest.fn(),
  };

  const setup = () => {
    const { getScopedClients, taskClient } = createMockGetScopedClients();
    const tool = createKiIdentificationStartTool({
      getScopedClients,
      telemetry: telemetry as never,
    });
    const context = createMockToolContext();

    return { tool, context, taskClient };
  };

  it('schedules onboarding and returns immediately by default', async () => {
    const { tool, context, taskClient } = setup();

    const result = await tool.handler(
      {
        stream_name: 'logs.nginx',
        steps: [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration],
      },
      context
    );

    expect(taskClient.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        task: {
          type: 'streams_onboarding',
          id: 'streams_onboarding_logs.nginx',
          space: '*',
        },
        params: expect.objectContaining({
          streamName: 'logs.nginx',
          steps: ['features_identification', 'queries_generation'],
          from: expect.any(Number),
          to: expect.any(Number),
        }),
        request: context.request,
      })
    );
    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual({
        kibanaPath: '/app/streams/logs.nginx/management/significantEvents',
      });
    }
  });

  it('returns error result when scheduling fails', async () => {
    const { tool, context, taskClient } = setup();
    taskClient.schedule.mockRejectedValueOnce(new Error('version conflict'));

    const result = await tool.handler(
      {
        stream_name: 'logs.nginx',
        steps: [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration],
      },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to start KI identification background task');
      expect(data.operation).toBe('ki_identification_start');
    }
  });
});
