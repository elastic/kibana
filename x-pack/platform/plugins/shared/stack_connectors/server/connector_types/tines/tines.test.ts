/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance, AxiosResponse } from 'axios';
import axios, { AxiosError } from 'axios';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { TinesConnector, WEBHOOK_AGENT_TYPE } from './tines';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { API_MAX_RESULTS, CONNECTOR_ID } from '@kbn/connector-schemas/tines';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

jest.mock('axios');
(axios as jest.Mocked<typeof axios>).create.mockImplementation(
  () => jest.fn() as unknown as AxiosInstance
);

jest.mock('@kbn/actions-plugin/server/lib/axios_utils');
const mockRequest = request as jest.Mock;

const url = 'https://example.com';
const email = 'some.email@test.com';
const token = '123';

const story = {
  id: 97469,
  name: 'Test story',
  published: true,
  team_id: 1234, // just to make sure it is cleaned
};
const storyResult = {
  id: story.id,
  name: story.name,
  published: story.published,
};

const otherAgent = {
  id: 941613,
  name: 'HTTP Req. Action',
  type: 'Agents::HTTPRequestAgent',
  story_id: 97469,
  options: {},
};
const webhookAgent = {
  ...otherAgent,
  name: 'Elastic Security Webhook',
  type: 'Agents::WebhookAgent',
  options: {
    path: '18f15eaaae93111d3187af42d236c8b2',
    secret: 'eb80106acb3ee1521985f5cec3dd224c',
  },
};
const webhookResult = {
  id: webhookAgent.id,
  name: webhookAgent.name,
  storyId: webhookAgent.story_id,
};
const webhookUrl = `${url}/webhook/${webhookAgent.options.path}/${webhookAgent.options.secret}`;
const actionUrl = `${url}/api/v1/actions/${webhookAgent.id}`;

const ignoredRequestFields = {
  axios: expect.anything(),
  configurationUtilities: expect.anything(),
  logger: expect.anything(),
};
const storiesGetRequestExpected = {
  ...ignoredRequestFields,
  method: 'get',
  data: {},
  url: `${url}/api/v1/stories`,
  headers: {
    'x-user-email': email,
    'x-user-token': token,
    'Content-Type': 'application/json',
  },
  params: { per_page: API_MAX_RESULTS },
  connectorUsageCollector: expect.any(ConnectorUsageCollector),
};

const agentsGetRequestExpected = {
  ...ignoredRequestFields,
  method: 'get',
  data: {},
  url: `${url}/api/v1/agents`,
  headers: {
    'x-user-email': email,
    'x-user-token': token,
    'Content-Type': 'application/json',
  },
  params: { story_id: story.id, action_type: WEBHOOK_AGENT_TYPE, per_page: API_MAX_RESULTS },
  connectorUsageCollector: expect.any(ConnectorUsageCollector),
};

const actionGetRequestExpected = {
  ...ignoredRequestFields,
  method: 'get',
  data: {},
  url: actionUrl,
  headers: {
    'x-user-email': email,
    'x-user-token': token,
    'Content-Type': 'application/json',
  },
  connectorUsageCollector: expect.any(ConnectorUsageCollector),
};

let connectorUsageCollector: ConnectorUsageCollector;

describe('TinesConnector', () => {
  const logger = loggingSystemMock.createLogger();
  const connector = new TinesConnector({
    configurationUtilities: actionsConfigMock.create(),
    config: { url },
    connector: { id: '1', type: CONNECTOR_ID },
    secrets: { email, token },
    logger,
    services: actionsMock.createServices(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
  });

  describe('getStories', () => {
    beforeAll(() => {
      mockRequest.mockReturnValue({ data: { stories: [story], meta: { pages: 1 } } });
    });

    it('should request Tines stories', async () => {
      await connector.getStories(undefined, connectorUsageCollector);
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(storiesGetRequestExpected);
    });

    it('should return the Tines stories reduced array', async () => {
      const { stories } = await connector.getStories(undefined, connectorUsageCollector);
      expect(stories).toEqual([storyResult]);
    });

    it('should request the Tines stories complete response', async () => {
      mockRequest.mockReturnValueOnce({
        data: { stories: [story], meta: { pages: 1 } },
      });
      const response = await connector.getStories(undefined, connectorUsageCollector);
      expect(response.incompleteResponse).toEqual(false);
    });

    it('should request the Tines stories incomplete response', async () => {
      mockRequest.mockReturnValueOnce({
        data: { stories: [story], meta: { pages: 2 } },
      });
      const response = await connector.getStories(undefined, connectorUsageCollector);
      expect(response.incompleteResponse).toEqual(true);
    });
  });

  describe('Error handling', () => {
    let error: AxiosError;

    beforeEach(() => {
      error = new AxiosError();
    });

    it('should return status text api error', () => {
      error.response = { status: 401, statusText: 'Unauthorized' } as AxiosResponse;
      // @ts-expect-error protected method
      const errorMessage = connector.getResponseErrorMessage(error);
      expect(errorMessage).toEqual('API Error: Unauthorized');
    });

    it('should return original error', () => {
      error.toString = () => 'Network Error';
      // @ts-expect-error protected method
      const errorMessage = connector.getResponseErrorMessage(error);
      expect(errorMessage).toEqual('Network Error');
    });
  });

  describe('getWebhooks', () => {
    beforeAll(() => {
      mockRequest.mockReturnValue({ data: { agents: [webhookAgent], meta: { pages: 1 } } });
    });

    it('should request Tines webhook actions', async () => {
      await connector.getWebhooks({ storyId: story.id }, connectorUsageCollector);

      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(agentsGetRequestExpected);
    });

    it('should return the Tines webhooks reduced array', async () => {
      const { webhooks } = await connector.getWebhooks(
        { storyId: story.id },
        connectorUsageCollector
      );
      expect(webhooks).toEqual([webhookResult]);
    });

    it('should request the Tines webhook complete response', async () => {
      mockRequest.mockReturnValueOnce({
        data: { agents: [webhookAgent], meta: { pages: 1 } },
      });
      const response = await connector.getWebhooks({ storyId: story.id }, connectorUsageCollector);
      expect(response.incompleteResponse).toEqual(false);
    });

    it('should request the Tines webhook incomplete response', async () => {
      mockRequest.mockReturnValueOnce({
        data: { agents: [webhookAgent], meta: { pages: 2 } },
      });
      const response = await connector.getWebhooks({ storyId: story.id }, connectorUsageCollector);
      expect(response.incompleteResponse).toEqual(true);
    });
  });

  describe('runWebhook', () => {
    it('should send data to Tines webhook using selected webhook parameter', async () => {
      mockRequest
        .mockReturnValueOnce({
          data: {
            ...webhookAgent,
          },
        })
        .mockReturnValueOnce({ data: { took: 5, requestId: '123', status: 'ok' } });

      await connector.runWebhook(
        {
          webhook: webhookResult,
          body: '[]',
        },
        connectorUsageCollector
      );

      expect(mockRequest).toBeCalledTimes(2);
      expect(mockRequest).toHaveBeenNthCalledWith(1, actionGetRequestExpected);
      expect(mockRequest).toHaveBeenNthCalledWith(2, {
        ...ignoredRequestFields,
        method: 'post',
        data: '[]',
        url: webhookUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        connectorUsageCollector,
      });
    });

    it('should send data to Tines webhook using webhook url parameter', async () => {
      mockRequest.mockReturnValue({ data: { took: 5, requestId: '123', status: 'ok' } });
      await connector.runWebhook(
        {
          webhookUrl,
          body: '[]',
        },
        connectorUsageCollector
      );

      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        method: 'post',
        data: '[]',
        url: webhookUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        connectorUsageCollector,
      });
    });
  });

  describe('logging', () => {
    it('should log debug messages for api requests', async () => {
      mockRequest.mockReturnValue({ data: { stories: [], meta: { pages: 1 } } });
      await connector.getStories(undefined, connectorUsageCollector);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`[tinesApiRequest]. URL: ${url}/api/v1/stories`)
      );
    });

    it('should log debug messages for getStories', async () => {
      mockRequest.mockReturnValue({ data: { stories: [], meta: { pages: 1 } } });
      await connector.getStories(undefined, connectorUsageCollector);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`[getStories] URL: ${url}/api/v1/stories`)
      );
    });

    it('should log debug messages for webhook parameters', async () => {
      mockRequest
        .mockReturnValueOnce({
          data: {
            ...webhookAgent,
          },
        })
        .mockReturnValueOnce({ data: { took: 5, requestId: '123', status: 'ok' } });

      await connector.runWebhook(
        {
          webhook: webhookResult,
          body: '[]',
        },
        connectorUsageCollector
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          `[getWebhookParameters] URL: ${url}/api/v1/actions/${webhookAgent.id}`
        )
      );
    });

    it('should log debug messages for run webhook', async () => {
      mockRequest.mockReturnValue({ data: { took: 5, requestId: '123', status: 'ok' } });
      await connector.runWebhook(
        {
          webhookUrl,
          body: '[]',
        },
        connectorUsageCollector
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`[runWebhook] URL: ${webhookUrl}`)
      );
    });

    it('should log debug messages for getWebhooks', async () => {
      mockRequest.mockReturnValue({ data: { agents: [], meta: { pages: 1 } } });
      await connector.getWebhooks({ storyId: story.id }, connectorUsageCollector);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`[getWebhooks] URL: ${url}/api/v1/agents, STORY_ID: ${story.id}`)
      );
    });
  });
});
