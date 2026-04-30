/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKiIdentificationCancelTool } from './tool';
import { createMockToolContext } from '../../utils/test_helpers';

describe('createKiIdentificationCancelTool', () => {
  const setup = () => {
    const workflowsManagementApi = {
      getWorkflowExecutions: jest.fn().mockResolvedValue({
        results: [
          {
            id: 'exec-1',
            status: 'running',
            context: { inputs: { streamName: 'logs.nginx' } },
          },
        ],
      }),
      cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };

    const tool = createKiIdentificationCancelTool({
      workflowsManagementApi: workflowsManagementApi as never,
    });
    const context = createMockToolContext();
    return { tool, context, workflowsManagementApi };
  };

  it('cancels workflow and returns cancelled status', async () => {
    const { tool, context, workflowsManagementApi } = setup();

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    expect(workflowsManagementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default'
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual({
        stream_name: 'logs.nginx',
        status: 'cancelled',
      });
    }
  });

  it('returns error result when cancellation fails', async () => {
    const { tool, context, workflowsManagementApi } = setup();
    workflowsManagementApi.cancelWorkflowExecution.mockRejectedValueOnce(new Error('boom'));

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to cancel KI identification workflow');
      expect(data.operation).toBe('ki_identification_cancel');
    }
  });
});
