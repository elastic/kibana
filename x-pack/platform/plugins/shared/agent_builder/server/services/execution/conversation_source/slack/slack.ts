/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  RoundInput,
  SlackConversationSourceInputMessage,
  SlackConversationSourceOutputMessage,
} from '@kbn/agent-builder-common';
import type { ConversationSourceType } from '@kbn/agent-builder-common';
import type { ConversationSourceAdapter } from '../adapter';

export class SlackSourceAdapter implements ConversationSourceAdapter<ConversationSourceType.Slack> {
  toRoundInput(input: SlackConversationSourceInputMessage): RoundInput {
    const { text } = input;
    return { message: text };
  }

  getOutputSchema(): Record<string, unknown> {
    return {
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
    };
  }

  toSourcePayload(round: ConversationRound): SlackConversationSourceOutputMessage {
    const {
      channel,
      thread_ts: threadTs,
      ts,
    } = round.input.source?.input as SlackConversationSourceInputMessage;
    const { text } = round.response.structured_output as SlackConversationSourceOutputMessage;

    return {
      channel,
      thread_ts: threadTs ?? ts,
      text,
    };
  }
}
