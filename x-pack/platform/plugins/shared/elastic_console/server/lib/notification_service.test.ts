/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendHandoffNotification } from './notification_service';
import * as slackClient from './slack_client';

jest.mock('./slack_client');

const mockPostMessage = slackClient.postMessage as jest.MockedFunction<
  typeof slackClient.postMessage
>;

const ORIGIN_REF = 'slack:C1234567890:1700000000.123456';
const BOT_TOKEN = 'xoxb-test-token';

beforeEach(() => {
  mockPostMessage.mockResolvedValue('1700000001.000000');
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('sendHandoffNotification', () => {
  it('posts to the correct channel and thread', async () => {
    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF });

    expect(mockPostMessage).toHaveBeenCalledWith(
      BOT_TOKEN,
      expect.objectContaining({
        channel: 'C1234567890',
        thread_ts: '1700000000.123456',
      })
    );
  });

  it('always includes the investigation complete header', async () => {
    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF });

    const { text } = mockPostMessage.mock.calls[0][1];
    expect(text).toContain('✅ *Investigation complete*');
  });

  it('always includes the continue conversation footer', async () => {
    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF });

    const { text } = mockPostMessage.mock.calls[0][1];
    expect(text).toContain('_Reply here to continue the conversation._');
  });

  it('includes investigation rounds when provided', async () => {
    const rounds = [
      { input: { message: 'What is the error?' }, response: { message: 'Out of memory.' } },
    ];

    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF, rounds });

    const { text } = mockPostMessage.mock.calls[0][1];
    expect(text).toContain('What is the error?');
    expect(text).toContain('Out of memory.');
    expect(text).toContain('*Investigation log*');
  });

  it('filters out [Investigation complete] synthetic rounds', async () => {
    const rounds = [
      { input: { message: '[Investigation complete]' }, response: { message: 'Hello! I am Claude' } },
      { input: { message: 'real question' }, response: { message: 'real answer' } },
    ];

    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF, rounds });

    const { text } = mockPostMessage.mock.calls[0][1];
    expect(text).not.toContain('[Investigation complete]');
    expect(text).not.toContain('Hello! I am Claude');
    expect(text).toContain('real question');
    expect(text).toContain('real answer');
  });

  it('shows at most MAX_TURNS (5) rounds', async () => {
    const rounds = Array.from({ length: 8 }, (_, i) => ({
      input: { message: `question ${i}` },
      response: { message: `answer ${i}` },
    }));

    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF, rounds });

    const { text } = mockPostMessage.mock.calls[0][1];
    // Last 5 shown, first 3 omitted
    expect(text).toContain('3 earlier exchanges omitted');
    expect(text).toContain('question 7');
    expect(text).not.toContain('question 0');
  });

  it('truncates long questions to 200 chars', async () => {
    const longQuestion = 'Q'.repeat(250);
    const rounds = [{ input: { message: longQuestion }, response: { message: 'answer' } }];

    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF, rounds });

    const { text } = mockPostMessage.mock.calls[0][1];
    expect(text).toContain('…');
    expect(text).not.toContain(longQuestion);
  });

  it('truncates long answers to 500 chars', async () => {
    const longAnswer = 'A'.repeat(600);
    const rounds = [{ input: { message: 'question' }, response: { message: longAnswer } }];

    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF, rounds });

    const { text } = mockPostMessage.mock.calls[0][1];
    expect(text).toContain('…');
    expect(text).not.toContain(longAnswer);
  });

  it('does nothing for an unknown provider', async () => {
    await sendHandoffNotification(BOT_TOKEN, { originRef: 'teams:channel:thread' });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('does nothing when originRef has no colon', async () => {
    await sendHandoffNotification(BOT_TOKEN, { originRef: 'invalid' });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('does nothing when the slack ref has no second colon', async () => {
    await sendHandoffNotification(BOT_TOKEN, { originRef: 'slack:onlychannel' });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('shows no investigation section when rounds is empty', async () => {
    await sendHandoffNotification(BOT_TOKEN, { originRef: ORIGIN_REF, rounds: [] });

    const { text } = mockPostMessage.mock.calls[0][1];
    expect(text).not.toContain('*Investigation log*');
    expect(text).not.toContain('─────────────────────');
  });
});
