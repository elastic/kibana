/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { cloneDeep } from 'lodash';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { deserializeMessage } from './deserialize_message';
import { safeJsonParse } from './safe_json_parse';

vi.mock('lodash', () => {
      const mocked = {
      cloneDeep: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./safe_json_parse', () => {
      const mocked = {
      safeJsonParse: vi.fn((value) => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('deserializeMessage', () => {
  const baseMessage: Message = {
    '@timestamp': '2024-10-15T00:00:00Z',
    message: {
      role: MessageRole.User,
      content: 'This is a message',
    },
  };

  beforeEach(() => {
    (cloneDeep as Mock).mockImplementation((obj) => JSON.parse(JSON.stringify(obj)));
  });

  it('should clone the original message', () => {
    const message = { ...baseMessage };
    deserializeMessage(message);

    expect(cloneDeep).toHaveBeenCalledWith(message);
  });

  it('should deserialize function_call.arguments if it is a string', () => {
    const messageWithFunctionCall: Message = {
      ...baseMessage,
      message: {
        ...baseMessage.message,
        function_call: {
          name: 'testFunction',
          arguments: '{"key": "value"}',
          trigger: MessageRole.Assistant,
        },
      },
    };

    const result = deserializeMessage(messageWithFunctionCall);

    expect(safeJsonParse).toHaveBeenCalledWith('{"key": "value"}');
    expect(result.message.function_call!.arguments).toEqual({ key: 'value' });
  });

  it('should deserialize message.content if it is a string', () => {
    const messageWithContent: Message = {
      ...baseMessage,
      message: {
        ...baseMessage.message,
        name: 'testMessage',
        content: '{"key": "value"}',
      },
    };

    const result = deserializeMessage(messageWithContent);

    expect(safeJsonParse).toHaveBeenCalledWith('{"key": "value"}');
    expect(result.message.content).toEqual({ key: 'value' });
  });

  it('should deserialize message.data if it is a string', () => {
    const messageWithData: Message = {
      ...baseMessage,
      message: {
        ...baseMessage.message,
        name: 'testMessage',
        data: '{"key": "value"}',
      },
    };

    const result = deserializeMessage(messageWithData);

    expect(safeJsonParse).toHaveBeenCalledWith('{"key": "value"}');
    expect(result.message.data).toEqual({ key: 'value' });
  });

  it('should return the copied message as is if no deserialization is needed', () => {
    const messageWithoutSerialization: Message = {
      ...baseMessage,
      message: {
        ...baseMessage.message,
        function_call: {
          name: 'testFunction',
          arguments: '',
          trigger: MessageRole.Assistant,
        },
        content: '',
      },
    };

    const result = deserializeMessage(messageWithoutSerialization);

    expect(result.message.function_call!.name).toEqual('testFunction');
    expect(result.message.function_call!.arguments).toEqual('');
    expect(result.message.content).toEqual('');
  });
});
