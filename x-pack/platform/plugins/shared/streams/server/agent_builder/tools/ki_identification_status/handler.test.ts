/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKiIdentificationStatusToolHandler } from './handler';

describe('getKiIdentificationStatusToolHandler', () => {
  it('returns workflow execution status for the stream', async () => {
    const completedExecution = {
      id: 'exec-1',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:01:00Z',
      duration: 60000,
      context: { inputs: { streamName: 'logs.nginx' } },
    };

    const getWorkflowExecutions = jest
      .fn()
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: [completedExecution] });

    const workflowsManagementApi = {
      getWorkflowExecutions,
      getWorkflowExecution: jest.fn().mockResolvedValue({
        ...completedExecution,
        context: { outputs: { result: 'ok' } },
      }),
    };

    const result = await getKiIdentificationStatusToolHandler({
      streamName: 'logs.nginx',
      workflowsManagementApi: workflowsManagementApi as never,
    });

    expect(result).toEqual(
      expect.objectContaining({
        stream_name: 'logs.nginx',
        status: 'completed',
        executionId: 'exec-1',
      })
    );
  });

  it('returns not_found when no executions exist', async () => {
    const workflowsManagementApi = {
      getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [] }),
    };

    const result = await getKiIdentificationStatusToolHandler({
      streamName: 'logs.nginx',
      workflowsManagementApi: workflowsManagementApi as never,
    });

    expect(result).toEqual(
      expect.objectContaining({
        stream_name: 'logs.nginx',
        status: 'not_found',
      })
    );
  });
});
