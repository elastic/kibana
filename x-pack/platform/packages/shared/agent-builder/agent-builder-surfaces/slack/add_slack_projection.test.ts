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
import { loggerMock } from '@kbn/logging-mocks';
import { addSlackProjection, type AddSlackProjectionOptions } from './add_slack_projection';

jest.mock('@elastic/isomer-sdk/slack', () => ({
  ...jest.requireActual('@elastic/isomer-sdk/slack'),
  renderSlackEnvelope: jest.fn(jest.requireActual('@elastic/isomer-sdk/slack').renderSlackEnvelope),
}));

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

const createRoundCompleteEvent = (message: string): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: { round: createRound(message) },
});

const createOptions = (
  overrides: Partial<AddSlackProjectionOptions> = {}
): AddSlackProjectionOptions => ({
  originType: ConversationOriginType.Slack,
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

  it('drops attachment tags', () => {
    const event = createRoundCompleteEvent('Hello\n\n<render_attachment id="a1" version="1" />');

    const slack = addSlackProjection(event, createOptions())?.projection?.slack;

    expect(JSON.stringify(slack)).toContain('Hello');
    expect(JSON.stringify(slack)).not.toContain('render_attachment');
  });

  it('sends the reply as markdown without tags when rendering fails', () => {
    jest.mocked(isomerSlack.renderSlackEnvelope).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const logger = loggerMock.create();
    const event = createRoundCompleteEvent('Hello\n\n<render_attachment id="a1" />');

    expect(addSlackProjection(event, createOptions({ logger }))?.projection?.slack).toEqual({
      text: 'Hello',
      blocks: [{ type: 'markdown', text: 'Hello' }],
    });
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
