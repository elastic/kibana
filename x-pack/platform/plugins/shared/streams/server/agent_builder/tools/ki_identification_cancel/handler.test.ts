/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cancelKiIdentificationToolHandler } from './handler';

describe('cancelKiIdentificationToolHandler', () => {
  it('cancels workflow execution and returns cancel acknowledgement', async () => {
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

    const result = await cancelKiIdentificationToolHandler({
      stream_name: 'logs.nginx',
      workflowsManagementApi: workflowsManagementApi as never,
    });

    expect(workflowsManagementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default'
    );
    expect(result).toEqual({
      stream_name: 'logs.nginx',
      status: 'cancelled',
    });
  });
});
