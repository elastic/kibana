/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import { Message, MessageRole } from '../../../common';
import { removeContextToolRequest } from './context';

const CONTEXT_FUNCTION_NAME = 'context';

describe('removeContextToolRequest', () => {
  const baseMessages: Message[] = [
    {
      '@timestamp': new Date().toISOString(),
      message: { role: MessageRole.User, content: 'First' },
    },
    {
      '@timestamp': new Date().toISOString(),
      message: { role: MessageRole.Assistant, content: 'Second' },
    },
  ];

  describe('when last message is a context function request', () => {
    let result: Message[];

    beforeEach(() => {
      const contextMessage: Message = {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.Assistant,
          function_call: { name: CONTEXT_FUNCTION_NAME, trigger: MessageRole.Assistant },
        },
      };
      result = removeContextToolRequest([...baseMessages, contextMessage]);
    });

    it('removes the context message', () => {
      expect(result).toEqual(baseMessages);
    });
  });

  describe('when last message is not a context function request', () => {
    let result: Message[];

    beforeEach(() => {
      const normalMessage: Message = {
        '@timestamp': new Date().toISOString(),
        message: { role: MessageRole.Assistant, name: 'tool_name', content: 'Some content' },
      };
      result = removeContextToolRequest([...baseMessages, normalMessage]);
    });

    it('returns all messages', () => {
      expect(result).toHaveLength(baseMessages.length + 1);
    });

    it('preserves the original messages', () => {
      expect(last(result)?.message.name).toEqual('tool_name');
      expect(last(result)?.message.content).toEqual('Some content');
    });
  });

  describe('when messages array is empty', () => {
    it('returns an empty array', () => {
      expect(removeContextToolRequest([])).toEqual([]);
    });
  });
});
