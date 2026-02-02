/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { request, createAxiosResponse } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { createExternalService } from './service';
import type { SlackApiService } from '../../../common/slack_api/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { SlackApiConfig } from '@kbn/connector-schemas/slack_api';
import { CONNECTOR_ID } from '@kbn/connector-schemas/slack_api';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);
const requestMock = request as jest.Mock;
const configurationUtilities = actionsConfigMock.create();
let connectorUsageCollector: ConnectorUsageCollector;

const channel = {
  id: 'channel_id_1',
  name: 'general',
  is_channel: true,
  is_archived: false,
  is_private: true,
};

const testBlock = {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
      },
    },
  ],
};

const getValidChannelIdResponse = createAxiosResponse({
  data: {
    ok: true,
    channel,
  },
});

const postMessageResponse = createAxiosResponse({
  data: [
    {
      ok: true,
      channel: 'general',
      message: {
        text: 'a message',
        type: 'message',
      },
    },
    {
      ok: true,
      channel: 'privat',
      message: {
        text: 'a message',
        type: 'message',
      },
    },
  ],
});

const postBlockkitResponse = createAxiosResponse({
  data: {
    bot_id: 'B06AMU52C9E',
    type: 'message',
    text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
    user: 'U069W74U6A1',
    ts: '1704383852.003159',
    app_id: 'A069Z4WDFEW',
    blocks: [
      {
        type: 'section',
        block_id: 'sDltQ',
        text: {
          type: 'mrkdwn',
          text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
          verbatim: false,
        },
      },
    ],
    team: 'TC0AARLHE',
    bot_profile: {
      id: 'B06AMU52C9E',
      app_id: 'A069Z4WDFEW',
      name: 'test slack web api',
      icons: {
        image_36: 'https://a.slack-edge.com/80588/img/plugins/app/bot_36.png',
        image_48: 'https://a.slack-edge.com/80588/img/plugins/app/bot_48.png',
        image_72: 'https://a.slack-edge.com/80588/img/plugins/app/service_72.png',
      },
      deleted: false,
      updated: 1702475971,
      team_id: 'TC0AARLHE',
    },
  },
});

const createExternalServiceMock = ({ config }: { config?: SlackApiConfig } = {}) =>
  createExternalService(
    {
      secrets: { token: 'token' },
      config,
    },
    logger,
    configurationUtilities,
    connectorUsageCollector
  );

describe('Slack API service', () => {
  let service: SlackApiService;

  beforeAll(() => {
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    service = createExternalServiceMock();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Secrets validation', () => {
    test('throws without token', () => {
      expect(() =>
        createExternalService(
          {
            secrets: { token: '' },
          },
          logger,
          configurationUtilities,
          connectorUsageCollector
        )
      ).toThrowErrorMatchingInlineSnapshot(`"[Action][Slack API]: Wrong configuration."`);
    });
  });

  describe('validChannelId', () => {
    test('should get slack channels', async () => {
      requestMock.mockImplementation(() => getValidChannelIdResponse);
      const res = await service.validChannelId('channel_id_1');
      expect(res).toEqual({
        actionId: CONNECTOR_ID,
        data: {
          ok: true,
          channel,
        },
        status: 'ok',
      });
    });

    test('should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => getValidChannelIdResponse);

      await service.validChannelId('channel_id_1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'get',
        url: 'https://slack.com/api/conversations.info?channel=channel_id_1',
        connectorUsageCollector,
      });
    });

    test('should throw an error if request to slack fail', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('request fail');
      });

      expect(await service.validChannelId('channel_id_1')).toEqual({
        actionId: CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'request fail',
        status: 'error',
      });
    });
  });

  describe('postMessage', () => {
    test('should call request with only channels argument', async () => {
      requestMock.mockImplementation(() => postMessageResponse);

      await service.postMessage({ channels: ['general', 'privat'], text: 'a message' });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'general', text: 'a message' },
        connectorUsageCollector,
      });
    });

    test('should call request with only channelIds argument', async () => {
      requestMock.mockImplementation(() => postMessageResponse);

      await service.postMessage({
        channels: ['general', 'privat'],
        channelIds: ['QWEERTYU987', 'POIUYT123'],
        text: 'a message',
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'QWEERTYU987', text: 'a message' },
        connectorUsageCollector,
      });
    });

    test('should call request with channels && channelIds  argument', async () => {
      requestMock.mockImplementation(() => postMessageResponse);

      await service.postMessage({ channelIds: ['QWEERTYU987', 'POIUYT123'], text: 'a message' });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        logger,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'QWEERTYU987', text: 'a message' },
        connectorUsageCollector,
      });
    });

    test('should throw an error if request to slack fail', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('request fail');
      });

      expect(
        await service.postMessage({ channels: ['general', 'privat'], text: 'a message' })
      ).toEqual({
        actionId: CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'request fail',
        status: 'error',
      });
    });
  });

  describe('postBlockkit', () => {
    test('should call request with only channels argument', async () => {
      requestMock.mockImplementation(() => postBlockkitResponse);

      await service.postBlockkit({
        channels: ['general', 'private'],
        text: JSON.stringify(testBlock),
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'general', blocks: testBlock.blocks },
        connectorUsageCollector,
      });
    });

    test('should call request with channels && channelIds  argument', async () => {
      requestMock.mockImplementation(() => postBlockkitResponse);

      await service.postBlockkit({
        channels: ['general', 'private'],
        channelIds: ['QWEERTYU987', 'POIUYT123'],
        text: JSON.stringify(testBlock),
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'QWEERTYU987', blocks: testBlock.blocks },
        connectorUsageCollector,
      });
    });

    test('should call request with only channelIds argument', async () => {
      requestMock.mockImplementation(() => postBlockkitResponse);

      await service.postBlockkit({
        channelIds: ['QWEERTYU987', 'POIUYT123'],
        text: JSON.stringify(testBlock),
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenNthCalledWith(1, {
        axios,
        logger,
        headers: {
          Authorization: 'Bearer token',
          'Content-type': 'application/json; charset=UTF-8',
        },
        configurationUtilities,
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: { channel: 'QWEERTYU987', blocks: testBlock.blocks },
        connectorUsageCollector,
      });
    });

    test('should throw an error if text is invalid JSON', async () => {
      expect(
        await service.postBlockkit({
          channelIds: ['QWEERTYU987', 'POIUYT123'],
          text: 'abc',
        })
      ).toEqual({
        actionId: CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'Unexpected token \'a\', "abc" is not valid JSON',
        status: 'error',
      });
    });

    test('should throw an error if request to slack fails', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('request fail');
      });

      expect(
        await service.postBlockkit({
          channelIds: ['QWEERTYU987', 'POIUYT123'],
          text: JSON.stringify(testBlock),
        })
      ).toEqual({
        actionId: CONNECTOR_ID,
        message: 'error posting slack message',
        serviceMessage: 'request fail',
        status: 'error',
      });
    });
  });

  describe('Channel names', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const methods = [
      ['postMessage', 'hello'],
      ['postBlockkit', JSON.stringify(testBlock)],
    ] as const;

    const errorNoAllowedChannelsRes = {
      actionId: CONNECTOR_ID,
      message: 'error posting slack message',
      serviceMessage:
        'One or more provided channel names are not included in the allowed channels list',
      status: 'error',
    };

    const errorNoChannelsRes = {
      actionId: CONNECTOR_ID,
      message: 'error posting slack message',
      serviceMessage:
        'One of channels, channelIds, or channelNames is required and cannot be empty',
      status: 'error',
    };

    describe.each(methods)('%s', (method, text) => {
      it.each([
        ['channelNames', '#channel-1'],
        ['channelIds', 'channel-id-1'],
        ['channels', 'my-channel'],
      ])('should post a message if allowedChannels is undefined and use %s', async (key, value) => {
        service = createExternalServiceMock({ config: {} });

        await service[method]({ [key]: [value], text });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: value }),
          })
        );
      });

      it.each([
        ['channelNames', '#channel-1'],
        ['channelIds', 'channel-id-1'],
        ['channels', 'my-channel'],
      ])(
        'should post a message if allowedChannels is an empty array and use channelsIds',
        async (key, value) => {
          service = createExternalServiceMock({ config: { allowedChannels: [] } });

          await service[method]({ [key]: [value], text });

          expect(requestMock).toHaveBeenCalledTimes(1);

          expect(requestMock).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({ channel: value }),
            })
          );
        }
      );

      it('should post a message if allowedChannels is an empty array and use channels', async () => {
        service = createExternalServiceMock({ config: {} });

        await service[method]({ channels: ['my-channel'], text });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'my-channel' }),
          })
        );
      });

      it('should throw an error if channelNames is not in allowedChannels', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ name: 'channel-name' }] },
        });

        expect(await service[method]({ channelNames: ['not-in-list'], text })).toEqual(
          errorNoAllowedChannelsRes
        );
      });

      it('should throw an error if channelIds is not in allowedChannels', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ id: 'channel-1-id', name: 'channel-name' }] },
        });

        expect(await service[method]({ channelIds: ['not-in-list'], text })).toEqual(
          errorNoAllowedChannelsRes
        );
      });

      it('should validate against allowedChannels.name for channelNames', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ id: 'channel-1-id', name: 'my-channel-name' }] },
        });

        expect(await service[method]({ channelNames: ['channel-1-id'], text })).toEqual(
          errorNoAllowedChannelsRes
        );
      });

      it('should validate against allowedChannels.id for channelIds', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ id: 'channel-1-id', name: 'my-channel-name' }] },
        });

        expect(await service[method]({ channelIds: ['my-channel-name'], text })).toEqual(
          errorNoAllowedChannelsRes
        );
      });

      it('should not throw if allowedChannels.name is set and channelIds is used', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ name: 'my-channel-name' }] },
        });

        await service[method]({ channelIds: ['channel-id-1'], text });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'channel-id-1' }),
          })
        );
      });

      it('should not validate again allowChannels properties for channels', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ id: 'my-channel', name: 'my-channel' }] },
        });

        await service[method]({ channels: ['my-channel'], text });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'my-channel' }),
          })
        );
      });

      it('should throw an error if allowedChannels, channelNames, channelIds, and channels are not provided', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ id: 'my-channel-id', name: 'my-channel-name' }] },
        });

        expect(await service[method]({ text })).toEqual(errorNoChannelsRes);
      });

      it('should throw an error if channelNames, channelIds, and channels are not provided but allowedChannels is', async () => {
        service = createExternalServiceMock({
          config: {},
        });

        expect(await service[method]({ text })).toEqual(errorNoChannelsRes);
      });

      it('channelNames should take priority over channelIds and channels', async () => {
        service = createExternalServiceMock({
          config: {},
        });

        await service[method]({
          channelNames: ['channel-name'],
          channelIds: ['channel-id'],
          channels: ['channel'],
          text,
        });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'channel-name' }),
          })
        );
      });

      it('channelIds should take priority over channels', async () => {
        service = createExternalServiceMock({
          config: {},
        });

        await service[method]({
          channelIds: ['channel-id'],
          channels: ['channel'],
          text,
        });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'channel-id' }),
          })
        );
      });

      it('channelNames should take priority over channelIds', async () => {
        service = createExternalServiceMock({
          config: {},
        });

        await service[method]({
          channelNames: ['channel-name'],
          channelIds: ['channel-id'],
          text,
        });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'channel-name' }),
          })
        );
      });

      it('channelNames should take priority over channels', async () => {
        service = createExternalServiceMock({
          config: {},
        });

        await service[method]({
          channelNames: ['channel-name'],
          channels: ['channel'],
          text,
        });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'channel-name' }),
          })
        );
      });

      it('should take the first provided channel for channelNames', async () => {
        service = createExternalServiceMock({ config: {} });

        await service[method]({ channelNames: ['channel-name-1', 'channel-name-2'], text });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'channel-name-1' }),
          })
        );
      });

      it('should take the first provided channel for channelIds', async () => {
        service = createExternalServiceMock({ config: {} });

        await service[method]({ channelIds: ['channel-id-1', 'channel-id-2'], text });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'channel-id-1' }),
          })
        );
      });

      it('should take the first provided channel for channels', async () => {
        service = createExternalServiceMock({ config: {} });

        await service[method]({ channels: ['channel-1', 'channel-2'], text });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: 'channel-1' }),
          })
        );
      });

      it('should validate correctly if the allowedChannels does not start with # but the channelNames does', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ name: 'channel-1' }] },
        });

        await service[method]({ channelNames: ['#channel-1'], text });

        expect(requestMock).toHaveBeenCalledTimes(1);

        expect(requestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ channel: '#channel-1' }),
          })
        );
      });

      it('should validate correctly if the allowedChannels does not start with # but contains it', async () => {
        service = createExternalServiceMock({
          config: { allowedChannels: [{ name: 'channel-#-1' }] },
        });

        expect(await service[method]({ channelNames: ['#channel-1'], text })).toEqual(
          errorNoAllowedChannelsRes
        );
      });
    });
  });
});
