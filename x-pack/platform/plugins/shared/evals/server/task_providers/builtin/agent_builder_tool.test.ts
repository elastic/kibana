/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsTaskContext } from '../types';
import { createAgentBuilderToolTaskProvider } from './agent_builder_tool';

const VALID_TRACE_ID = 'a'.repeat(32);
const ALL_ZERO_TRACE_ID = '0'.repeat(32);

const buildContext = (
  callKibanaApi: jest.Mock,
  overrides: Partial<EvalsTaskContext> = {}
): EvalsTaskContext =>
  ({
    input: { query: 'find high value trades' },
    connectorId: 'my-connector',
    toolId: 'platform.core.execute_esql',
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    getInferenceClient: jest.fn(),
    callKibanaApi,
    ...overrides,
  } as unknown as EvalsTaskContext);

describe('agentBuilder.tool task provider', () => {
  it('returns the trace id surfaced by the tools/_execute route', async () => {
    const callKibanaApi = jest.fn(async () => ({
      status: 200,
      headers: {},
      body: { results: [{ type: 'query' }], trace_id: VALID_TRACE_ID },
    }));
    const provider = createAgentBuilderToolTaskProvider();

    const result = await provider.run(buildContext(callKibanaApi));

    expect(result.traceId).toBe(VALID_TRACE_ID);
    expect(result.output).toEqual({ results: [{ type: 'query' }] });
    expect(callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/api/agent_builder/tools/_execute',
        body: {
          tool_id: 'platform.core.execute_esql',
          tool_params: { query: 'find high value trades' },
          connector_id: 'my-connector',
        },
      })
    );
  });

  it('normalizes the all-zero (tracing-disabled) trace id to undefined', async () => {
    const callKibanaApi = jest.fn(async () => ({
      status: 200,
      headers: {},
      body: { results: [], trace_id: ALL_ZERO_TRACE_ID },
    }));
    const provider = createAgentBuilderToolTaskProvider();

    const result = await provider.run(buildContext(callKibanaApi));

    expect(result.traceId).toBeUndefined();
  });

  it('returns undefined trace id when the route omits it', async () => {
    const callKibanaApi = jest.fn(async () => ({
      status: 200,
      headers: {},
      body: { results: [] },
    }));
    const provider = createAgentBuilderToolTaskProvider();

    const result = await provider.run(buildContext(callKibanaApi));

    expect(result.traceId).toBeUndefined();
  });

  it('prefers explicit tool_params from params over the example input', async () => {
    const callKibanaApi = jest.fn(async () => ({
      status: 200,
      headers: {},
      body: { results: [], trace_id: VALID_TRACE_ID },
    }));
    const provider = createAgentBuilderToolTaskProvider();

    await provider.run(buildContext(callKibanaApi, { params: { tool_params: { limit: 5 } } }));

    expect(callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ tool_params: { limit: 5 } }) })
    );
  });

  it('throws when no tool id is provided', async () => {
    const callKibanaApi = jest.fn();
    const provider = createAgentBuilderToolTaskProvider();

    await expect(provider.run(buildContext(callKibanaApi, { toolId: undefined }))).rejects.toThrow(
      /requires a tool_id/
    );
    expect(callKibanaApi).not.toHaveBeenCalled();
  });
});
