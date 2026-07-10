/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  SlackConversationSourceInputMessage,
} from '@kbn/agent-builder-common';
import { ConversationRoundStatus, ConversationSourceType } from '@kbn/agent-builder-common';
import { SlackSourceAdapter } from './slack';

describe('SlackSourceAdapter', () => {
  const adapter = new SlackSourceAdapter();

  describe('toRoundInput', () => {
    it('maps the slack message text to the round input message', () => {
      const message: SlackConversationSourceInputMessage = {
        channel: 'C123',
        text: '@agent what is our error rate?',
        ts: '1712345678.000100',
        thread_ts: '1712345678.000000',
        user: 'U123',
      };

      expect(adapter.toRoundInput(message)).toEqual({
        message: '@agent what is our error rate?',
      });
    });
  });

  describe('getOutputSchema', () => {
    it('returns a minimal slack text schema with mrkdwn formatting guidance', () => {
      expect(adapter.getOutputSchema()).toEqual({
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description:
              'Slack mrkdwn text to post back to the conversation. Use *bold* (single asterisks), _italic_ (underscores), ~strikethrough~, `inline code`, triple-backtick code blocks without language tags, links as <https://example.com|label>, and "-" bullet lists. Do not use GitHub markdown links, headings, tables, or horizontal rules. Keep it concise and conversational.',
          },
        },
        required: ['text'],
        additionalProperties: false,
      });
    });
  });

  describe('toSourcePayload', () => {
    const createRound = ({
      rawInput,
      structuredOutput,
      message = 'generic response',
    }: {
      rawInput: SlackConversationSourceInputMessage;
      structuredOutput: Record<string, unknown>;
      message?: string;
    }): ConversationRound => ({
      id: 'round-1',
      status: ConversationRoundStatus.completed,
      input: {
        message: rawInput.text,
        source: {
          input: rawInput,
        },
      },
      source: {
        type: ConversationSourceType.Slack,
      },
      steps: [],
      response: {
        message,
        structured_output: structuredOutput,
      },
      started_at: '2026-01-01T00:00:00.000Z',
      time_to_first_token: 1,
      time_to_last_token: 2,
      model_usage: {
        connector_id: 'connector-1',
        llm_calls: 1,
        input_tokens: 10,
        output_tokens: 20,
      },
    });

    it('preserves the slack thread timestamp when composing a payload', () => {
      const rawInput: SlackConversationSourceInputMessage = {
        channel: 'C123',
        text: '@agent summarize this',
        ts: '1712345678.000100',
        thread_ts: '1712345678.000000',
        user: 'U123',
      };

      expect(
        adapter.toSourcePayload(
          createRound({
            rawInput,
            structuredOutput: {
              text: '*Summary* from the agent',
            },
            message: 'generic markdown response',
          })
        )
      ).toEqual({
        channel: 'C123',
        thread_ts: '1712345678.000000',
        text: '*Summary* from the agent',
      });
    });

    it('uses the original slack timestamp when no thread timestamp exists', () => {
      const rawInput: SlackConversationSourceInputMessage = {
        channel: 'C123',
        text: '@agent summarize this',
        ts: '1712345678.000100',
      };

      expect(
        adapter.toSourcePayload(
          createRound({
            rawInput,
            structuredOutput: {
              text: 'Root reply',
            },
          })
        )
      ).toEqual({
        channel: 'C123',
        thread_ts: '1712345678.000100',
        text: 'Root reply',
      });
    });
  });
});
