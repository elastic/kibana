/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnboardingStatus } from '@kbn/streams-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { OnboardingWorkflowClient } from '../../../lib/workflows/onboarding_workflow_client';
import { createKiIdentificationCancelTool } from './tool';
import { createMockToolContext } from '../../utils/test_helpers';

describe('createKiIdentificationCancelTool', () => {
  const setup = () => {
    const managementApi = {
      getWorkflowExecutions: jest.fn().mockResolvedValue({
        results: [{ id: 'exec-1', status: ExecutionStatus.RUNNING }],
      }),
      cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };
    const onboardingClient = new OnboardingWorkflowClient({
      managementApi: managementApi as never,
    });

    const tool = createKiIdentificationCancelTool({
      onboardingClient,
    });
    const context = createMockToolContext();
    return { tool, context, managementApi };
  };

  it('cancels workflow execution and returns canceled status', async () => {
    const { tool, context, managementApi } = setup();

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      context.request
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual({
        stream_name: 'logs.nginx',
        execution_id: 'exec-1',
        status: OnboardingStatus.Canceled,
      });
    }
  });

  it('returns error result when cancellation fails', async () => {
    const { tool, context, managementApi } = setup();
    managementApi.cancelWorkflowExecution.mockRejectedValueOnce(new Error('boom'));

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to cancel KI identification background task');
      expect(data.operation).toBe('ki_identification_cancel');
    }
  });
});
