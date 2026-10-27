/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import { lastValueFrom, of } from 'rxjs';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type { ChatCompleteCompositeResponse } from '@kbn/inference-common';
import { GenAISemanticConventions } from './types';
import { withChatCompleteSpan } from './with_chat_complete_span';

const mockSpan = {
  setAttribute: jest.fn().mockReturnThis(),
  setAttributes: jest.fn().mockReturnThis(),
  isRecording: jest.fn().mockReturnValue(true),
} as unknown as Span;

jest.mock('./with_active_inference_span', () => ({
  withActiveInferenceSpan: jest.fn((_name: string, _opts: unknown, cb: (span: Span) => unknown) =>
    cb(mockSpan)
  ),
}));

const CACHE_READ = GenAISemanticConventions.GenAIUsageCacheReadInputTokens;
const CACHE_WRITE = GenAISemanticConventions.GenAIUsageCacheWriteInputTokens;

const getTokenAttributes = (): Record<string, number> => {
  const call = (mockSpan.setAttributes as jest.Mock).mock.calls.find(
    ([attrs]) => GenAISemanticConventions.GenAIUsageInputTokens in attrs
  );
  return call?.[0];
};

const getOutputMessages = (): Array<{ finish_reason: string }> => {
  const call = (mockSpan.setAttribute as jest.Mock).mock.calls.find(
    ([key]) => key === GenAISemanticConventions.GenAIOutputMessages
  );
  expect(call).toBeDefined();
  return JSON.parse(call![1]);
};

const options = { messages: [] };

describe('withChatCompleteSpan token attributes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockSpan.isRecording as jest.Mock).mockReturnValue(true);
  });

  describe.each([
    [
      'observable',
      async (tokens: {
        prompt: number;
        completion: number;
        cached?: number;
        cacheWrite?: number;
      }) =>
        lastValueFrom(
          withChatCompleteSpan(
            options,
            () =>
              of({
                type: ChatCompletionEventType.ChatCompletionTokenCount,
                tokens: { total: tokens.prompt + tokens.completion, ...tokens },
              }) as unknown as ChatCompleteCompositeResponse
          ) as ReturnType<typeof of>
        ),
    ],
    [
      'promise',
      async (tokens: {
        prompt: number;
        completion: number;
        cached?: number;
        cacheWrite?: number;
      }) =>
        withChatCompleteSpan(
          options,
          () =>
            Promise.resolve({
              content: '',
              toolCalls: [],
              tokens: { total: tokens.prompt + tokens.completion, ...tokens },
            }) as unknown as ChatCompleteCompositeResponse
        ),
    ],
  ])('%s response', (_name, run) => {
    it('records the cache read and write tokens', async () => {
      await run({ prompt: 100, completion: 10, cached: 40, cacheWrite: 20 });
      const attributes = getTokenAttributes();
      expect(attributes[CACHE_READ]).toBe(40);
      expect(attributes[CACHE_WRITE]).toBe(20);
    });

    it('records a cache write of zero', async () => {
      await run({ prompt: 100, completion: 10, cached: 0, cacheWrite: 0 });
      const attributes = getTokenAttributes();
      expect(attributes[CACHE_READ]).toBe(0);
      expect(attributes[CACHE_WRITE]).toBe(0);
    });

    it('omits the cache write attribute when it is absent', async () => {
      await run({ prompt: 100, completion: 10, cached: 40 });
      const attributes = getTokenAttributes();
      expect(attributes[CACHE_READ]).toBe(40);
      expect(CACHE_WRITE in attributes).toBe(false);
    });
  });
});

describe('withChatCompleteSpan output message finish_reason', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockSpan.isRecording as jest.Mock).mockReturnValue(true);
  });

  describe('streaming responses', () => {
    it('propagates the provider-reported finish_reason (content_filter) onto the span', async () => {
      await lastValueFrom(
        withChatCompleteSpan(
          options,
          () =>
            of({
              type: ChatCompletionEventType.ChatCompletionMessage,
              content: '',
              toolCalls: [],
              finish_reason: 'content_filter',
            } as unknown as ChatCompleteCompositeResponse) as ReturnType<typeof of>
        )
      );

      expect(getOutputMessages()[0].finish_reason).toBe('content_filter');
    });

    it('keeps finish_reason "stop" for a normal response (no regression)', async () => {
      await lastValueFrom(
        withChatCompleteSpan(
          options,
          () =>
            of({
              type: ChatCompletionEventType.ChatCompletionMessage,
              content: 'all good',
              toolCalls: [],
            } as unknown as ChatCompleteCompositeResponse) as ReturnType<typeof of>
        )
      );

      expect(getOutputMessages()[0].finish_reason).toBe('stop');
    });

    it('keeps finish_reason "tool_calls" for a tool-call response without a reported finish reason', async () => {
      await lastValueFrom(
        withChatCompleteSpan(
          options,
          () =>
            of({
              type: ChatCompletionEventType.ChatCompletionMessage,
              content: '',
              toolCalls: [
                { toolCallId: 'tc-1', function: { name: 'myTool', arguments: { a: 1 } } },
              ],
            } as unknown as ChatCompleteCompositeResponse) as ReturnType<typeof of>
        )
      );

      expect(getOutputMessages()[0].finish_reason).toBe('tool_calls');
    });
  });

  describe('non-streaming responses', () => {
    it('propagates the provider-reported finish_reason (content_filter) onto the span', async () => {
      await withChatCompleteSpan(
        options,
        () =>
          Promise.resolve({
            content: '',
            toolCalls: [],
            finish_reason: 'content_filter',
          }) as unknown as ChatCompleteCompositeResponse
      );

      expect(getOutputMessages()[0].finish_reason).toBe('content_filter');
    });

    it('keeps finish_reason "stop" for a normal response (no regression)', async () => {
      await withChatCompleteSpan(
        options,
        () =>
          Promise.resolve({
            content: 'all good',
            toolCalls: [],
          }) as unknown as ChatCompleteCompositeResponse
      );

      expect(getOutputMessages()[0].finish_reason).toBe('stop');
    });
  });
});
