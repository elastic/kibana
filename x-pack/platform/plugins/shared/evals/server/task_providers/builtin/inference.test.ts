/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const mockTraceId = 'a'.repeat(32);

jest.mock('../tracing', () => ({
  withEvalsTaskSpan: jest.fn((_name: string, run: () => Promise<unknown>) => run()),
  getCurrentTraceId: jest.fn(() => mockTraceId),
}));

import type { EvalsTaskContext } from '../types';
import { getCurrentTraceId, withEvalsTaskSpan } from '../tracing';
import { createInferenceTaskProvider } from './inference';

const buildContext = (
  chatComplete: jest.Mock,
  overrides: Partial<EvalsTaskContext> = {}
): EvalsTaskContext =>
  ({
    input: { prompt: 'Say the word hello.' },
    connectorId: 'my-connector',
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    getInferenceClient: jest.fn(async () => ({ chatComplete })),
    callKibanaApi: jest.fn(),
    ...overrides,
  } as unknown as EvalsTaskContext);

describe('inference task provider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('runs inside a task span and returns the active trace id with the output', async () => {
    const chatComplete = jest.fn(async () => ({ content: 'hello', toolCalls: [] }));
    const provider = createInferenceTaskProvider();

    const result = await provider.run(buildContext(chatComplete));

    expect(withEvalsTaskSpan).toHaveBeenCalledTimes(1);
    expect(getCurrentTraceId).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(result.traceId).toBe(mockTraceId);
    expect(result.output).toEqual({ content: 'hello' });
  });

  it('forwards tool calls when the model returns them', async () => {
    const toolCalls = [{ toolCallId: '1', function: { name: 'do_thing', arguments: {} } }];
    const chatComplete = jest.fn(async () => ({ content: '', toolCalls }));
    const provider = createInferenceTaskProvider();

    const result = await provider.run(buildContext(chatComplete));

    expect(result.output).toEqual({ content: '', tool_calls: toolCalls });
  });

  it('passes a system prompt from params when provided', async () => {
    const chatComplete = jest.fn(async () => ({ content: 'ok', toolCalls: [] }));
    const provider = createInferenceTaskProvider();

    await provider.run(buildContext(chatComplete, { params: { system: 'be terse' } }));

    expect(chatComplete).toHaveBeenCalledWith(expect.objectContaining({ system: 'be terse' }));
  });
});
