/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsTaskContext } from '../types';
import { createAgentBuilderConverseTaskProvider } from './agent_builder_converse';

const VALID_TRACE_ID = 'a'.repeat(32);
const OTHER_TRACE_ID = 'b'.repeat(32);
const ALL_ZERO_TRACE_ID = '0'.repeat(32);

const buildContext = (
  callKibanaApi: jest.Mock,
  overrides: Partial<EvalsTaskContext> = {}
): EvalsTaskContext =>
  ({
    input: { question: 'What is Elastic?' },
    connectorId: 'my-connector',
    agentId: 'my-agent',
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    getInferenceClient: jest.fn(),
    callKibanaApi,
    ...overrides,
  } as unknown as EvalsTaskContext);

describe('agentBuilder.converse task provider', () => {
  it('returns the round trace id and the agent message', async () => {
    const callKibanaApi = jest.fn(async () => ({
      status: 200,
      headers: {},
      body: { response: { message: 'Elastic is a search company.' }, trace_id: VALID_TRACE_ID },
    }));
    const provider = createAgentBuilderConverseTaskProvider();

    const result = await provider.run(buildContext(callKibanaApi));

    expect(result.traceId).toBe(VALID_TRACE_ID);
    expect(result.output).toEqual({ message: 'Elastic is a search company.' });
  });

  it('takes the first id when the round returns an array of trace ids', async () => {
    const callKibanaApi = jest.fn(async () => ({
      status: 200,
      headers: {},
      body: { response: { message: 'ok' }, trace_id: [OTHER_TRACE_ID, VALID_TRACE_ID] },
    }));
    const provider = createAgentBuilderConverseTaskProvider();

    const result = await provider.run(buildContext(callKibanaApi));

    expect(result.traceId).toBe(OTHER_TRACE_ID);
  });

  it('normalizes the all-zero (tracing-disabled) trace id to undefined', async () => {
    const callKibanaApi = jest.fn(async () => ({
      status: 200,
      headers: {},
      body: { response: { message: 'ok' }, trace_id: ALL_ZERO_TRACE_ID },
    }));
    const provider = createAgentBuilderConverseTaskProvider();

    const result = await provider.run(buildContext(callKibanaApi));

    expect(result.traceId).toBeUndefined();
  });

  it('throws when no agent id is provided', async () => {
    const callKibanaApi = jest.fn();
    const provider = createAgentBuilderConverseTaskProvider();

    await expect(provider.run(buildContext(callKibanaApi, { agentId: undefined }))).rejects.toThrow(
      /requires an agent_id/
    );
    expect(callKibanaApi).not.toHaveBeenCalled();
  });
});
