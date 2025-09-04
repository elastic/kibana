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
});
