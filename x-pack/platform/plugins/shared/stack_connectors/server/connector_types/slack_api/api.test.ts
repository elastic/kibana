/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackApiService } from '../../../common/slack_api/types';
import { api } from './api';

const createMock = (): jest.Mocked<SlackApiService> => {
  const service = {
    postMessage: jest.fn().mockImplementation(() => ({
      status: 'ok',
      data: {
        ok: true,
        channel: 'general',
        message: {
          text: 'a message',
          type: 'message',
        },
      },
      actionId: '.slack_api',
    })),
    postBlockkit: jest.fn().mockImplementation(() => ({
      status: 'ok',
      data: {
        ok: true,
        channel: 'general',
        message: {
          text: 'a blockkit message',
        },
      },
      actionId: '.slack_api',
    })),
    validChannelId: jest.fn().mockImplementation(() => ({
      status: 'ok',
      data: {
        ok: true,
        channel: {
          id: 'channel_id_1',
          name: 'general',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      },
      actionId: '.slack_api',
    })),
    searchChannels: jest.fn().mockImplementation(() => ({
      status: 'ok',
      data: {
        ok: true,
        messages: {
          matches: [
            {
              channel: { id: 'C123', name: 'general' },
              text: 'test message',
              user: 'U123',
              username: 'testuser',
              ts: '1234567890.123456',
              permalink: 'https://slack.com/archives/C123/p1234567890123456',
            },
          ],
          total: 1,
        },
      },
      actionId: '.slack_api',
    })),
  };

  return service;
};

const slackServiceMock = {
  create: createMock,
};

describe('api', () => {
  let externalService: jest.Mocked<SlackApiService>;

  beforeEach(() => {
    externalService = slackServiceMock.create();
  });

  test('validChannelId', async () => {
    const res = await api.validChannelId({
      externalService,
      params: { channelId: 'channel_id_1' },
    });

    expect(res).toEqual({
      status: 'ok',
      data: {
        ok: true,
        channel: {
          id: 'channel_id_1',
          name: 'general',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      },
      actionId: '.slack_api',
    });
  });

  test('postMessage with channels params', async () => {
    const res = await api.postMessage({
      externalService,
      params: { channels: ['general'], text: 'a message' },
    });

    expect(res).toEqual({
      status: 'ok',
      data: {
        ok: true,
        channel: 'general',
        message: {
          text: 'a message',
          type: 'message',
        },
      },
      actionId: '.slack_api',
    });
  });

  test('postMessage with channelIds params', async () => {
    const res = await api.postMessage({
      externalService,
      params: { channelIds: ['general'], text: 'a message' },
    });

    expect(res).toEqual({
      status: 'ok',
      data: {
        ok: true,
        channel: 'general',
        message: {
          text: 'a message',
          type: 'message',
        },
      },
      actionId: '.slack_api',
    });
  });

  test('postBlockkit with channelIds params', async () => {
    const res = await api.postBlockkit({
      externalService,
      params: { channelIds: ['general'], text: 'a blockkit message' },
    });

    expect(res).toEqual({
      status: 'ok',
      data: {
        ok: true,
        channel: 'general',
        message: {
          text: 'a blockkit message',
        },
      },
      actionId: '.slack_api',
    });
  });

  test('searchChannels', async () => {
    const res = await api.searchChannels({
      externalService,
      params: { query: 'test', count: 20, page: 1 },
    });

    expect(res).toEqual({
      status: 'ok',
      data: {
        ok: true,
        messages: {
          matches: [
            {
              channel: { id: 'C123', name: 'general' },
              text: 'test message',
              user: 'U123',
              username: 'testuser',
              ts: '1234567890.123456',
              permalink: 'https://slack.com/archives/C123/p1234567890123456',
            },
          ],
          total: 1,
        },
      },
      actionId: '.slack_api',
    });
  });
});
