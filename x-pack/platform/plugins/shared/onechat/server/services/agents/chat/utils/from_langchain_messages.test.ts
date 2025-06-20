/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { extractTextContent, getToolCalls } from './from_langchain_messages';
import { toolIdToLangchain } from './tool_provider_to_langchain_tools';

describe('extractTextContent', () => {
  it('should extract string content from a message', () => {
    const message = new AIMessage({ content: 'Hello, world!' });
    expect(extractTextContent(message)).toBe('Hello, world!');
  });

  it('should extract concatenated text from complex content', () => {
    const message = new AIMessage({
      content: [
        { type: 'text', text: 'Hello, ' },
        { type: 'text', text: 'world!' },
      ],
    });
    expect(extractTextContent(message)).toBe('Hello, world!');
  });

  it('should ignore non-text types in complex content', () => {
    const message = new AIMessage({
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'image', image_url: 'https://example.com/image.jpg' },
        { type: 'text', text: ' world!' },
      ],
    });
    expect(extractTextContent(message)).toBe('Hello world!');
  });
});

describe('getToolCalls', () => {
  it('should return tool calls for AIMessage with tool_calls', () => {
    const message = new AIMessage({
      content: 'I will help you',
      tool_calls: [
        {
          id: 'tool-1',
          name: toolIdToLangchain({ toolId: 'search', providerId: 'test' }),
          args: { query: 'test' },
        },
        {
          id: 'tool-2',
          name: toolIdToLangchain({ toolId: 'lookup', providerId: 'test' }),
          args: { id: 42 },
        },
      ],
    });
    const result = getToolCalls(message);
    expect(result).toEqual([
      {
        toolCallId: 'tool-1',
        toolId: { toolId: 'search', providerId: 'test' },
        args: { query: 'test' },
      },
      {
        toolCallId: 'tool-2',
        toolId: { toolId: 'lookup', providerId: 'test' },
        args: { id: 42 },
      },
    ]);
  });

  it('should return an empty array for AIMessage without tool_calls', () => {
    const message = new AIMessage({ content: 'No tools here' });
    expect(getToolCalls(message)).toEqual([]);
  });

  it('should return an empty array for non-AIMessage', () => {
    const message = new HumanMessage({ content: 'User message' });
    expect(getToolCalls(message)).toEqual([]);
  });

  it('should throw if a tool call is missing an id', () => {
    const message = new AIMessage({
      content: 'Oops',
      tool_calls: [
        {
          name: 'broken',
          args: {},
        } as any,
      ],
    });
    expect(() => getToolCalls(message)).toThrow('Tool call must have an id');
  });
});
