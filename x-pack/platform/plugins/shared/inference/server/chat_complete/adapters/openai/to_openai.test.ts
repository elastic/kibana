/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, ToolChoiceType } from '@kbn/inference-common';
import type { InferenceConnector, ToolOptions } from '@kbn/inference-common';
import { OpenAiProviderType } from './types';
import { messagesToOpenAI, toolChoiceToOpenAI, toolsToOpenAI } from './to_openai';

describe('toolChoiceToOpenAI', () => {
  it('returns the right value for tool choice types', () => {
    expect(toolChoiceToOpenAI(ToolChoiceType.none)).toEqual('none');
    expect(toolChoiceToOpenAI(ToolChoiceType.auto)).toEqual('auto');
    expect(toolChoiceToOpenAI(ToolChoiceType.required)).toEqual('required');
  });

  it('returns the right value for undefined', () => {
    expect(toolChoiceToOpenAI(undefined)).toBeUndefined();
  });

  it('returns the right value for named functions', () => {
    expect(toolChoiceToOpenAI({ function: 'foo' })).toEqual({
      type: 'function',
      function: { name: 'foo' },
    });
  });

  it('returns "required" for Other providers with native tool calling enabled and a single matching tool', () => {
    const connector = {
      config: {
        apiProvider: OpenAiProviderType.Other,
        enableNativeFunctionCalling: true,
      },
    } as unknown as InferenceConnector;

    const tools: NonNullable<ToolOptions['tools']> = {
      myTool: {
        description: 'desc',
        schema: { type: 'object', properties: {} },
      },
    };

    // Named tool matches the only tool available => coerced to 'required'
    expect(toolChoiceToOpenAI({ function: 'myTool' }, { connector, tools })).toEqual('required');
  });

  it('keeps named-function mapping when native tool calling is disabled, even for Other providers', () => {
    const connector = {
      config: {
        apiProvider: OpenAiProviderType.Other,
        enableNativeFunctionCalling: false,
      },
    } as unknown as InferenceConnector;

    const tools: NonNullable<ToolOptions['tools']> = {
      myTool: {
        description: 'desc',
        schema: { type: 'object', properties: {} },
      },
    };

    expect(toolChoiceToOpenAI({ function: 'myTool' }, { connector, tools })).toEqual({
      type: 'function',
      function: { name: 'myTool' },
    });
  });
});

describe('toolsToOpenAI', () => {
  it('converts tools to the expected format', () => {
    expect(
      toolsToOpenAI({
        myTool: {
          description: 'my tool',
          schema: {
            type: 'object',
            description: 'my tool schema',
            properties: {
              foo: {
                type: 'string',
              },
            },
          },
        },
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "function": Object {
            "description": "my tool",
            "name": "myTool",
            "parameters": Object {
              "description": "my tool schema",
              "properties": Object {
                "foo": Object {
                  "type": "string",
                },
              },
              "type": "object",
            },
          },
          "type": "function",
        },
      ]
    `);
  });
});

describe('messagesToOpenAI', () => {
  it('converts a user message', () => {
    expect(
      messagesToOpenAI({
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      })
    ).toEqual([
      {
        content: 'question',
        role: 'user',
      },
    ]);
  });

  it('converts single message and system', () => {
    expect(
      messagesToOpenAI({
        system: 'system message',
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      })
    ).toEqual([
      {
        content: 'system message',
        role: 'system',
      },
      {
        content: 'question',
        role: 'user',
      },
    ]);
  });

  it('converts a tool call', () => {
    expect(
      messagesToOpenAI({
        messages: [
          {
            role: MessageRole.Tool,
            name: 'tool',
            response: {},
            toolCallId: 'callId',
          },
        ],
      })
    ).toEqual([
      {
        content: '{}',
        role: 'tool',
        tool_call_id: 'callId',
      },
    ]);
  });

  it('converts an assistant message', () => {
    expect(
      messagesToOpenAI({
        messages: [
          {
            role: MessageRole.Assistant,
            content: 'response',
          },
        ],
      })
    ).toEqual([
      {
        role: 'assistant',
        content: 'response',
      },
    ]);
  });

  it('converts an assistant tool call', () => {
    expect(
      messagesToOpenAI({
        messages: [
          {
            role: MessageRole.Assistant,
            content: null,
            toolCalls: [
              {
                toolCallId: 'id',
                function: {
                  name: 'function',
                  arguments: {},
                },
              },
            ],
          },
        ],
      })
    ).toEqual([
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            function: {
              arguments: '{}',
              name: 'function',
            },
            id: 'id',
            type: 'function',
          },
        ],
      },
    ]);
  });

  describe('message merging', () => {
    it('merges consecutive user messages into a single message with array content', () => {
      const result = messagesToOpenAI({
        messages: [
          { role: MessageRole.User, content: 'first' },
          { role: MessageRole.User, content: 'second' },
        ],
      });

      expect(result).toEqual([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'first' },
            { type: 'text', text: 'second' },
          ],
        },
      ]);
    });

    it('merges consecutive user messages with mixed string and array content', () => {
      const result = messagesToOpenAI({
        messages: [
          { role: MessageRole.User, content: 'text message' },
          {
            role: MessageRole.User,
            content: [
              { type: 'image', source: { data: 'base64data', mimeType: 'image/png' } },
              { type: 'text', text: 'with image' },
            ],
          },
        ],
      });

      expect(result).toEqual([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'text message' },
            { type: 'image_url', image_url: { url: 'base64data' } },
            { type: 'text', text: 'with image' },
          ],
        },
      ]);
    });

    it('does not merge non-consecutive same-role messages', () => {
      const result = messagesToOpenAI({
        messages: [
          { role: MessageRole.User, content: 'first' },
          { role: MessageRole.Assistant, content: 'response' },
          { role: MessageRole.User, content: 'second' },
        ],
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ role: 'user', content: 'first' });
      expect(result[1]).toEqual(
        expect.objectContaining({ role: 'assistant', content: 'response' })
      );
      expect(result[2]).toEqual({ role: 'user', content: 'second' });
    });

    it('does not merge consecutive tool messages', () => {
      const result = messagesToOpenAI({
        messages: [
          { role: MessageRole.Tool, name: 'tool', toolCallId: 'call-1', response: { result: 'a' } },
          { role: MessageRole.Tool, name: 'tool', toolCallId: 'call-2', response: { result: 'b' } },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'tool',
        content: '{"result":"a"}',
        tool_call_id: 'call-1',
      });
      expect(result[1]).toEqual({
        role: 'tool',
        content: '{"result":"b"}',
        tool_call_id: 'call-2',
      });
    });

    it('merges consecutive assistant messages and combines tool_calls', () => {
      const result = messagesToOpenAI({
        messages: [
          {
            role: MessageRole.Assistant,
            content: 'thinking...',
            toolCalls: [
              { toolCallId: 'call-1', function: { name: 'tool_a', arguments: { x: 1 } } },
            ],
          },
          {
            role: MessageRole.Assistant,
            content: 'more thoughts',
            toolCalls: [
              { toolCallId: 'call-2', function: { name: 'tool_b', arguments: { y: 2 } } },
            ],
          },
        ],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: 'thinking...\nmore thoughts',
        tool_calls: [
          expect.objectContaining({
            id: 'call-1',
            function: expect.objectContaining({ name: 'tool_a' }),
          }),
          expect.objectContaining({
            id: 'call-2',
            function: expect.objectContaining({ name: 'tool_b' }),
          }),
        ],
      });
    });

    it('does not merge user messages separated by an empty assistant message', () => {
      const result = messagesToOpenAI({
        messages: [
          { role: MessageRole.User, content: 'first' },
          { role: MessageRole.Assistant, content: '', toolCalls: [] },
          { role: MessageRole.User, content: 'second' },
        ],
      });

      expect(result).toHaveLength(3);
    });
  });
});
