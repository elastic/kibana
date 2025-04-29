/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TIMEOUT_MS, OPENAI_CONNECTOR_ID } from '../../../common/openai/constants';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { DEFAULT_OPENAI_MODEL } from '../../../common/openai/constants';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { OpenAIConnector } from './openai';
import { OpenAiProviderType } from '../../../common/openai/constants';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { RunActionResponseSchema } from '../../../common/openai/schema';

const logger = loggingSystemMock.createLogger();
describe('OpenAI with proxy config', () => {
  let mockProxiedRequest: jest.Mock;
  let connectorUsageCollector: ConnectorUsageCollector;
  const mockDefaults = {
    timeout: DEFAULT_TIMEOUT_MS,
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'post',
    responseSchema: RunActionResponseSchema,
  };

  const mockResponse = {
    headers: {},
    data: {},
  };

  const configurationUtilities = actionsConfigMock.create();
  const PROXY_HOST = 'proxy.custom.elastic.co';
  const PROXY_URL = `http://${PROXY_HOST}`;
  const PROXY_BYPASS_HOSTS = ['proxy-bypass-1.elastic.co', 'proxy-bypass-2.elastic.co'];

  configurationUtilities.getProxySettings.mockReturnValue({
    proxyUrl: PROXY_URL,
    proxySSLSettings: {
      verificationMode: 'none',
    },
    proxyBypassHosts: new Set(PROXY_BYPASS_HOSTS),
    proxyOnlyHosts: undefined,
  });

  const connector = new OpenAIConnector({
    configurationUtilities,
    connector: { id: '1', type: OPENAI_CONNECTOR_ID },
    config: {
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      apiProvider: OpenAiProviderType.OpenAi,
      defaultModel: DEFAULT_OPENAI_MODEL,
      organizationId: 'org-id',
      projectId: 'proj-id',
      headers: {
        'X-My-Custom-Header': 'foo',
        Authorization: 'override',
      },
    },
    secrets: { apiKey: '123' },
    logger,
    services: actionsMock.createServices(),
  });

  const sampleOpenAiBody = {
    messages: [
      {
        role: 'user',
        content: 'Hello world',
      },
    ],
  };

  beforeEach(() => {
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
    mockProxiedRequest = jest.fn().mockResolvedValue(mockResponse);
    // @ts-ignore
    connector.request = mockProxiedRequest;
    jest.clearAllMocks();
  });

  it('verifies that the OpenAI client is initialized with the correct HTTP agent', () => {
    // @ts-ignore .openAI is private
    const openAIClient = connector.openAI;

    // Verify the client was initialized with the correct agent configuration
    expect(openAIClient).toBeDefined();
    expect(openAIClient.httpAgent).toBeDefined();
    expect(openAIClient.httpAgent.proxy).toBeDefined();
    expect(openAIClient.httpAgent.proxy.host).toBe(PROXY_HOST);
    expect(openAIClient.httpAgent.proxy.port).toBe(80);
  });

  it('verifies that requests use the configured HTTP agent', async () => {
    // Make a test request
    const response = await connector.runApi(
      { body: JSON.stringify(sampleOpenAiBody) },
      connectorUsageCollector
    );
    expect(mockProxiedRequest).toBeCalledTimes(1);
    expect(mockProxiedRequest).toHaveBeenCalledWith(
      {
        ...mockDefaults,
        signal: undefined,
        data: JSON.stringify({
          ...sampleOpenAiBody,
          stream: false,
          model: DEFAULT_OPENAI_MODEL,
        }),
        headers: {
          Authorization: 'Bearer 123',
          'X-My-Custom-Header': 'foo',
          'content-type': 'application/json',
          'OpenAI-Organization': 'org-id',
          'OpenAI-Project': 'proj-id',
        },
      },
      connectorUsageCollector
    );
    expect(response).toEqual(mockResponse.data);
  });

  // it('verifies that streaming requests use the configured HTTP agent', async () => {
  //   // Make a streaming request
  //   await connector.invokeAsyncIterator(
  //     { messages: [{ role: 'user', content: 'test' }] },
  //     connectorUsageCollector
  //   );

  //   // Verify the streaming request was made with the correct agent
  //   expect(mockProxiedRequest).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       httpAgent: expect.objectContaining({
  //         proxy: expect.objectContaining({
  //           host: 'proxy.example.com',
  //           port: 80,
  //         }),
  //         options: expect.objectContaining({
  //           rejectUnauthorized: false,
  //         }),
  //       }),
  //     })
  //   );
  // });
});
