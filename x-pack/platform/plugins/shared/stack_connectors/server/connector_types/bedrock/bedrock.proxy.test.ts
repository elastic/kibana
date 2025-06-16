/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_BEDROCK_URL, DEFAULT_TIMEOUT_MS } from '../../../common/bedrock/constants';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { BedrockConnector } from './bedrock';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { RunActionResponseSchema } from '../../../common/bedrock/schema';

const logger = loggingSystemMock.createLogger();

// Mock an instance of the Bedrock class
// with overridden flag for purpose of jest test
// jest.mock('@aws-sdk/client-bedrock-runtime', () => {
//   const UnmodifiedBedrockClient = jest.requireActual(
//     '@aws-sdk/client-bedrock-runtime'
//   ).BedrockRuntimeClient;
//
//   return {
//     __esModule: true,
//     default: jest.fn().mockImplementation((config) => {
//       return new UnmodifiedBedrockClient({
//         ...config,
//         dangerouslyAllowBrowser: true,
//       });
//     }),
//   };
// });
describe('Bedrock with proxy config', () => {
  let mockProxiedRequest: jest.Mock;
  let connectorUsageCollector: ConnectorUsageCollector;
  const mockDefaults = {
    timeout: DEFAULT_TIMEOUT_MS,
    url: DEFAULT_BEDROCK_URL,
    method: 'post',
    responseSchema: RunActionResponseSchema,
  };

  const mockResponse = {
    headers: {},
    data: {
      content: [{ type: 'text', text: 'hello world' }],
      stop_reason: 'stop_sequence',
      usage: {
        input_tokens: 25,
        output_tokens: 88,
      },
    },
  };

  const configurationUtilities = actionsConfigMock.create();
  const PROXY_HOST = 'proxy.custom.elastic.co';
  const PROXY_URL = `http://${PROXY_HOST}`;

  configurationUtilities.getProxySettings.mockReturnValue({
    proxyUrl: PROXY_URL,
    proxySSLSettings: {
      verificationMode: 'none',
    },
    proxyBypassHosts: undefined,
    proxyOnlyHosts: undefined,
  });

  const connector = new BedrockConnector({
    configurationUtilities,
    connector: { id: '1', type: '.bedrock' },
    config: {
      apiUrl: DEFAULT_BEDROCK_URL,
      defaultModel: 'claude',
    },
    secrets: { accessKey: '123', secret: '567' },
    logger,
    services: actionsMock.createServices(),
  });

  const sampleBedrockBody = {
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

  it('verifies that the Bedrock client is initialized with the custom proxy HTTP agent', () => {
    // @ts-ignore .bedrock is private
    const bedrockClient = connector.bedrockClient;

    // Verify the client was initialized with the custom agent configuration
    expect(bedrockClient).toBeDefined();
    expect(bedrockClient.config.httpOptions).toBeDefined();
    expect(bedrockClient.config.httpOptions.agent).toBeDefined();
    expect(bedrockClient.config.httpOptions.agent.proxy.host).toBe(PROXY_HOST);
    expect(bedrockClient.config.httpOptions.agent.proxy.port).toBe(80);
  });
});
