/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowClient } from './workflow_client';

const http = { get: jest.fn(), post: jest.fn() };
const client = createWorkflowClient(http as never);

describe('the workflow client', () => {
  beforeEach(() => jest.resetAllMocks());

  it('asks for a workflow by id, at the version of the API it is written for', async () => {
    http.get.mockResolvedValue({ id: 'w1' });

    await client.get('w1');

    expect(http.get).toHaveBeenCalledWith('/api/workflows/workflow/w1', { version: '2023-10-31' });
  });

  it('writes an id so that it cannot change which route is called', async () => {
    http.get.mockResolvedValue({});

    await client.get('a/b?c');

    expect(http.get).toHaveBeenCalledWith('/api/workflows/workflow/a%2Fb%3Fc', expect.anything());
  });

  it('lists the workflows that match a search, a few at a time', async () => {
    http.get.mockResolvedValue({ results: [], total: 0 });

    await client.list({ query: 'isolate', size: 20 });

    expect(http.get).toHaveBeenCalledWith('/api/workflows', {
      version: '2023-10-31',
      query: { size: 20, query: 'isolate' },
    });
  });

  it('does not search for nothing', async () => {
    http.get.mockResolvedValue({ results: [], total: 0 });

    await client.list({ size: 20 });

    expect(http.get.mock.calls[0][1].query).toEqual({ size: 20 });
  });

  it('runs a workflow with its inputs and where the run comes from, and gives the execution', async () => {
    http.post.mockResolvedValue({ workflowExecutionId: 'exec-1' });

    const result = await client.run('w1', {
      inputs: { host: 'web-1' },
      metadata: { source: 'custom_app', nodeId: 'go', appId: 'app-1' },
    });

    expect(result).toEqual({ workflowExecutionId: 'exec-1' });
    expect(http.post).toHaveBeenCalledWith('/api/workflows/workflow/w1/run', {
      version: '2023-10-31',
      body: JSON.stringify({
        inputs: { host: 'web-1' },
        metadata: { source: 'custom_app', nodeId: 'go', appId: 'app-1' },
      }),
    });
  });
});
