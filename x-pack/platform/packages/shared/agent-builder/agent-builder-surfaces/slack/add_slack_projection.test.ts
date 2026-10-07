/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as isomerSlack from '@elastic/isomer-sdk/slack';
import {
  ChatEventType,
  ConversationOriginType,
  ConversationRoundStatus,
  type ConversationRound,
  type MessageCompleteEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { loggerMock } from '@kbn/logging-mocks';
import { addSlackProjection, type AddSlackProjectionOptions } from './add_slack_projection';

jest.mock('@elastic/isomer-sdk/slack', () => ({
  ...jest.requireActual('@elastic/isomer-sdk/slack'),
  renderSlackEnvelope: jest.fn(jest.requireActual('@elastic/isomer-sdk/slack').renderSlackEnvelope),
}));

const conversationUrl = 'http://localhost:5601/app/agent_builder/agents/a/conversations/c';

const createRound = (message: string): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'user message' },
  response: { message },
  steps: [],
  started_at: '2026-10-06T00:00:00.000Z',
  time_to_first_token: 0,
  time_to_last_token: 0,
  model_usage: { connector_id: 'unknown', input_tokens: 0, output_tokens: 0, llm_calls: 0 },
});

const esqlAttachment: VersionedAttachment = {
  id: 'a1',
  type: 'esql',
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { query: 'FROM logs | LIMIT 10' },
      created_at: '2026-10-06T00:00:00.000Z',
      content_hash: 'hash',
    },
  ],
};

const createRoundCompleteEvent = (
  message: string,
  attachments: VersionedAttachment[] = []
): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: { round: createRound(message), attachments },
});

const createOptions = (
  overrides: Partial<AddSlackProjectionOptions> = {}
): AddSlackProjectionOptions => ({
  originType: ConversationOriginType.Slack,
  getMapping: () => undefined,
  getConversationUrl: () => conversationUrl,
  logger: loggerMock.create(),
  ...overrides,
});

describe('addSlackProjection', () => {
  it('adds the reply as Block Kit', () => {
    const event = createRoundCompleteEvent('There are **3** [alerts](https://example.com).');

    expect(addSlackProjection(event, createOptions())).toEqual({
      ...event,
      projection: {
        slack: {
          text: expect.any(String),
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: 'There are *3* <https://example.com|alerts>.' },
            },
          ],
        },
      },
    });
  });

  it('renders mapped attachments in place of their tags', () => {
    const event = createRoundCompleteEvent(
      'Here is the query:\n\n<render_attachment id="a1" version="1" />',
      [esqlAttachment]
    );
    const options = createOptions({
      getMapping: () => (data) => ({
        type: 'view',
        body: [{ type: 'markdown', text: `\`${(data as { query: string }).query}\`` }],
      }),
    });

    const slack = addSlackProjection(event, options)?.projection?.slack;

    expect(JSON.stringify(slack)).toContain('FROM logs | LIMIT 10');
    expect(JSON.stringify(slack)).not.toContain('render_attachment');
  });

  it('links unmapped attachments to Kibana', () => {
    const event = createRoundCompleteEvent('<render_attachment id="a1" />', [esqlAttachment]);

    const slack = addSlackProjection(event, createOptions())?.projection?.slack;

    expect(JSON.stringify(slack)).toContain(`<${conversationUrl}|View in Kibana>`);
    expect(JSON.stringify(slack)).not.toContain('render_attachment');
  });

  it('returns nothing when rendering fails', () => {
    jest.mocked(isomerSlack.renderSlackEnvelope).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const logger = loggerMock.create();

    expect(
      addSlackProjection(createRoundCompleteEvent('Hello'), createOptions({ logger }))
    ).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('does not mutate the original event', () => {
    const event = createRoundCompleteEvent('Hello');

    addSlackProjection(event, createOptions());

    expect(event).not.toHaveProperty('projection');
  });

  it('returns nothing for rounds without a Slack origin', () => {
    const event = createRoundCompleteEvent('Hello');

    expect(addSlackProjection(event, createOptions({ originType: undefined }))).toBeUndefined();
  });

  it('returns nothing when the reply is empty', () => {
    expect(addSlackProjection(createRoundCompleteEvent(''), createOptions())).toBeUndefined();
  });

  it('returns nothing for events other than round_complete', () => {
    const event: MessageCompleteEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'message-1', message_content: 'Hello' },
    };

    expect(addSlackProjection(event, createOptions())).toBeUndefined();
  });
});
