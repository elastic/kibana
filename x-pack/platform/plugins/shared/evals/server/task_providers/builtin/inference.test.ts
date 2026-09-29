/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

const mockTraceId = 'a'.repeat(32);

vi.mock('../tracing', () => {
      const mocked = {
      withEvalsTaskSpan: vi.fn((_name: string, run: () => Promise<unknown>) => run()),
      getCurrentTraceId: vi.fn(() => mockTraceId),
    };
      return { ...mocked, default: mocked };
    });

import type { EvalsTaskContext } from '../types';
import { getCurrentTraceId, withEvalsTaskSpan } from '../tracing';
import { createInferenceTaskProvider } from './inference';

const buildContext = (
  chatComplete: Mock,
  overrides: Partial<EvalsTaskContext> = {}
): EvalsTaskContext =>
  ({
    input: { prompt: 'Say the word hello.' },
    connectorId: 'my-connector',
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    abortSignal: new AbortController().signal,
    getInferenceClient: vi.fn(async () => ({ chatComplete })),
    callKibanaApi: vi.fn(),
    ...overrides,
  } as unknown as EvalsTaskContext);

describe('inference task provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs inside a task span and returns the active trace id with the output', async () => {
    const chatComplete = vi.fn(async () => ({ content: 'hello', toolCalls: [] }));
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
    const chatComplete = vi.fn(async () => ({ content: '', toolCalls }));
    const provider = createInferenceTaskProvider();

    const result = await provider.run(buildContext(chatComplete));

    expect(result.output).toEqual({ content: '', tool_calls: toolCalls });
  });

  it('passes a system prompt from params when provided', async () => {
    const chatComplete = vi.fn(async () => ({ content: 'ok', toolCalls: [] }));
    const provider = createInferenceTaskProvider();

    await provider.run(buildContext(chatComplete, { params: { system: 'be terse' } }));

    expect(chatComplete).toHaveBeenCalledWith(expect.objectContaining({ system: 'be terse' }));
  });
});
