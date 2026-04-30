/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKiIdentificationStatusTool } from './tool';
import { createMockToolContext } from '../../utils/test_helpers';

describe('createKiIdentificationStatusTool', () => {
  const setup = () => {
    const completedExecution = {
      id: 'exec-1',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:01:00Z',
      duration: 60000,
      context: { inputs: { streamName: 'logs.nginx' } },
    };

    const workflowsManagementApi = {
      getWorkflowExecutions: jest
        .fn()
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [completedExecution] }),
      getWorkflowExecution: jest.fn().mockResolvedValue({
        ...completedExecution,
        context: { outputs: { result: 'ok' } },
      }),
    };

    const tool = createKiIdentificationStatusTool({
      workflowsManagementApi: workflowsManagementApi as never,
    });
    const context = createMockToolContext();
    return { tool, context, workflowsManagementApi };
  };

  it('returns workflow execution status for stream', async () => {
    const { tool, context } = setup();

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          stream_name: 'logs.nginx',
          status: 'completed',
          executionId: 'exec-1',
        })
      );
    }
  });

  it('returns error result when status retrieval fails', async () => {
    const workflowsManagementApi = {
      getWorkflowExecutions: jest.fn().mockRejectedValue(new Error('boom')),
    };

    const tool = createKiIdentificationStatusTool({
      workflowsManagementApi: workflowsManagementApi as never,
    });
    const context = createMockToolContext();

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to get KI identification workflow status');
      expect(data.operation).toBe('ki_identification_status');
    }
  });
});
