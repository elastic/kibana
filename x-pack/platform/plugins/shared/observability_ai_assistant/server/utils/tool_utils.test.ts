/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceLastUserMessage } from './tool_utils';
import { Logger } from '@kbn/logging';
import { Message, MessageRole } from '../../common';
import { last } from 'lodash';

const messageHistory: Message[] = [
  {
    '@timestamp': '2025-06-18T13:29:47.290Z',
    message: { role: MessageRole.User, content: 'First message from user' },
  },
  {
    '@timestamp': '2025-06-18T13:30:02.350Z',
    message: {
      content: 'Reply from LLM',
      function_call: {
        name: '',
        arguments: '',
        trigger: MessageRole.Assistant,
      },
      role: MessageRole.Assistant,
    },
  },
];

describe('replaceLastUserMessage', () => {
  const noopLogger = { warn: () => {} } as unknown as Logger;

  describe('when last message is a user message without function name', () => {
    let result: Message[];

    beforeEach(() => {
      const lastUserMessage = {
        '@timestamp': new Date().toISOString(),
        message: { role: MessageRole.User, content: 'Non-updated message' },
      };

      result = replaceLastUserMessage({
        messages: [...messageHistory, lastUserMessage],
        newMessageContent: 'Updated message',
        logger: noopLogger,
      });
    });

    it('returns all message', () => {
      expect(result).toHaveLength(3);
    });

    it('updates the message content', () => {
      expect(last(result)?.message.content).toBe('Updated message');
    });

    it('does not add a function name', () => {
      expect(last(result)?.message.name).toBeUndefined();
    });
  });

  describe('when last message is a user message with function name', () => {
    let result: Message[];

    beforeEach(() => {
      const lastUserMessage = {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          name: 'doSomething',
          content: 'Non-updated message',
        },
      };

      result = replaceLastUserMessage({
        messages: [...messageHistory, lastUserMessage],
        newMessageContent: 'Updated message',
        logger: noopLogger,
      });
    });

    it('returns all messages', () => {
      expect(result).toHaveLength(3);
    });

    it('retains the message role as User', () => {
      expect(last(result)?.message.role).toBe(MessageRole.User);
    });

    it('stringifies the new content', () => {
      expect(last(result)?.message.content).toBe(JSON.stringify('Updated message'));
    });

    it('retains the tool name', () => {
      expect(last(result)?.message.name).toBe('doSomething');
    });
  });

  describe('when last message is not a user message', () => {
    let result: Message[];

    beforeEach(() => {
      const lastUserMessage: Message = {
        '@timestamp': new Date().toISOString(),
        message: { role: MessageRole.Assistant, content: 'Non-updated message' },
      };

      result = replaceLastUserMessage({
        messages: [...messageHistory, lastUserMessage],
        newMessageContent: 'Updated message',
        logger: noopLogger,
      });
    });

    it('returns all messages', () => {
      expect(result).toHaveLength(3);
    });

    it('returns the original messages', () => {
      expect(last(result)?.message.content).toBe('Non-updated message');
    });
  });
});
