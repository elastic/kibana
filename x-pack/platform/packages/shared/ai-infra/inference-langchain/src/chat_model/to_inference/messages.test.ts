/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { UserMessage } from '@kbn/inference-common';
import { messagesToInference } from './messages';

describe('messagesToInference', () => {
  describe('image content', () => {
    it('parses a data URL into mimeType and raw base64 data', () => {
      const input = new HumanMessage({
        content: [
          { type: 'text', text: 'look at this' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } },
        ],
      });

      const { messages } = messagesToInference([input]);

      expect((messages[0] as UserMessage).content).toEqual([
        { type: 'text', text: 'look at this' },
        { type: 'image', source: { data: 'AAA', mimeType: 'image/png' } },
      ]);
    });

    it('passes malformed input through with an empty mime type', () => {
      const input = new HumanMessage({
        content: [{ type: 'image_url', image_url: { url: 'not-a-data-url' } }],
      });

      const { messages } = messagesToInference([input]);

      expect((messages[0] as UserMessage).content).toEqual([
        { type: 'image', source: { data: 'not-a-data-url', mimeType: '' } },
      ]);
    });
  });

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
