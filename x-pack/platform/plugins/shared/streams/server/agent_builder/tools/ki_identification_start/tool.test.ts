/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKiIdentificationStartTool } from './tool';
import { createMockToolContext } from '../../utils/test_helpers';
import { OnboardingStep } from '@kbn/streams-schema';

describe('createKiIdentificationStartTool', () => {
  const telemetry = {
    trackAgentToolKiIdentificationStarted: jest.fn(),
  };

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

    const tool = createKiIdentificationStartTool({
      workflowsManagementApi: workflowsManagementApi as never,
      telemetry: telemetry as never,
    });
    const context = createMockToolContext();

    return { tool, context, workflowsManagementApi };
  };

  it('runs workflow and returns immediately by default', async () => {
    const { tool, context, workflowsManagementApi } = setup();

    const result = await tool.handler(
      {
        stream_name: 'logs.nginx',
        steps: [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration],
      },
      context
    );

    expect(workflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '.streams-ki-onboarding',
      }),
      'default',
      expect.objectContaining({ streamName: 'logs.nginx' }),
      expect.anything()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual({
        kibanaPath: '/app/streams/logs.nginx/management/significantEvents',
      });
    }
  });

  it('returns error result when workflow run fails', async () => {
    const { tool, context, workflowsManagementApi } = setup();
    workflowsManagementApi.runWorkflow.mockRejectedValueOnce(new Error('version conflict'));

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
