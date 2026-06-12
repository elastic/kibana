/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolMessage } from '@langchain/core/messages';
import { messagesToInference } from './messages';

describe('messagesToInference', () => {
  describe('tool messages', () => {
    it('parses the response when parseable', () => {
      const input = new ToolMessage({
        content: JSON.stringify({ foo: 'bar' }),
        tool_call_id: 'toolCallId',
      });

      const { messages } = messagesToInference([input]);

      expect(messages[0]).toEqual({
        name: 'toolCallId',
        toolCallId: 'toolCallId',
        role: 'tool',
        response: {
          foo: 'bar',
        },
      });
    });
    it('structures the response when not parseable', () => {
      const input = new ToolMessage({
        content: 'some text response',
        tool_call_id: 'toolCallId',
      });

      const { messages } = messagesToInference([input]);

      expect(messages[0]).toEqual({
        name: 'toolCallId',
        toolCallId: 'toolCallId',
        role: 'tool',
        response: {
          response: 'some text response',
        },
      });
    });
  });
});
