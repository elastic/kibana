/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import { lastValueFrom, of } from 'rxjs';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type {
  ChatCompletionTokenCount,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
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
    {
      name: 'observable',
      run: (tokens: ChatCompletionTokenCount) =>
        lastValueFrom(
          withChatCompleteSpan(options, () =>
            of<ChatCompletionTokenCountEvent>({
              type: ChatCompletionEventType.ChatCompletionTokenCount,
              tokens,
            })
          )
        ),
    },
    {
      name: 'promise',
      run: (tokens: ChatCompletionTokenCount) =>
        withChatCompleteSpan(options, () =>
          Promise.resolve({ content: '', toolCalls: [], tokens })
        ),
    },
  ])('$name response', ({ run }) => {
    it.each([
      { thinking: 12, output: 22 },
      { thinking: 0, output: 10 },
    ])('includes $thinking reasoning tokens in the output total', async ({ thinking, output }) => {
      await run({ prompt: 100, completion: 10, thinking, total: 100 + output });
      const attributes = getTokenAttributes();
      expect(attributes[GenAISemanticConventions.GenAIUsageOutputTokens]).toBe(output);
      expect(attributes[GenAISemanticConventions.GenAIUsageReasoningOutputTokens]).toBe(thinking);
    });

    it('records the completion count alone when reasoning usage is absent', async () => {
      await run({ prompt: 100, completion: 10, total: 110 });
      const attributes = getTokenAttributes();
      expect(attributes[GenAISemanticConventions.GenAIUsageOutputTokens]).toBe(10);
      expect(GenAISemanticConventions.GenAIUsageReasoningOutputTokens in attributes).toBe(false);
    });

    it('does not record NaN output tokens when the completion count is missing', async () => {
      await run({ prompt: 100, thinking: 12, total: 112 } as unknown as ChatCompletionTokenCount);
      const attributes = getTokenAttributes();
      expect(attributes[GenAISemanticConventions.GenAIUsageOutputTokens]).toBe(12);
    });

    it('leaves the output tokens unset when neither completion nor reasoning usage is reported', async () => {
      await run({ prompt: 100, total: 100 } as unknown as ChatCompletionTokenCount);
      const attributes = getTokenAttributes();
      expect(GenAISemanticConventions.GenAIUsageOutputTokens in attributes).toBe(false);
      expect(GenAISemanticConventions.GenAIUsageReasoningOutputTokens in attributes).toBe(false);
    });

    it('records the cache read and write tokens', async () => {
      await run({ prompt: 100, completion: 10, total: 110, cached: 40, cacheWrite: 20 });
      const attributes = getTokenAttributes();
      expect(attributes[CACHE_READ]).toBe(40);
      expect(attributes[CACHE_WRITE]).toBe(20);
    });

    it('records a cache write of zero', async () => {
      await run({ prompt: 100, completion: 10, total: 110, cached: 0, cacheWrite: 0 });
      const attributes = getTokenAttributes();
      expect(attributes[CACHE_READ]).toBe(0);
      expect(attributes[CACHE_WRITE]).toBe(0);
    });

    it('omits the cache write attribute when it is absent', async () => {
      await run({ prompt: 100, completion: 10, total: 110, cached: 40 });
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

    it.each(['tool_use', 'stop'])(
      'normalizes a provider-reported "%s" to "tool_calls" when tool calls are present',
      async (providerReason) => {
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
                finish_reason: providerReason,
              } as unknown as ChatCompleteCompositeResponse) as ReturnType<typeof of>
          )
        );

        expect(getOutputMessages()[0].finish_reason).toBe('tool_calls');
      }
    );
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
