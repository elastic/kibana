/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_URL } from '@kbn/connector-schemas/bedrock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { BedrockConnector } from './bedrock';
import { loggingSystemMock } from '@kbn/core/server/mocks';

// Asserting on the options the connector hands to NodeHttpHandler keeps these
// tests pinned to our own agent-selection logic rather than to @smithy's
// internal resolved-config shape, which has changed across minor versions.
jest.mock('@smithy/node-http-handler');

const nodeHttpHandlerMock = NodeHttpHandler as jest.MockedClass<typeof NodeHttpHandler>;

const logger = loggingSystemMock.createLogger();

describe('Bedrock with proxy config', () => {
  const configurationUtilities = actionsConfigMock.create();
  const PROXY_HOST = 'proxy.custom.elastic.co';
  const PROXY_PORT = '99';
  const PROXY_URL_HTTP = `http://${PROXY_HOST}:${PROXY_PORT}`;
  const PROXY_URL_HTTPS = `https://${PROXY_HOST}:${PROXY_PORT}`;

  // Constructed for its side effect: the connector builds the NodeHttpHandler
  // we assert on.
  const createConnector = () =>
    new BedrockConnector({
      configurationUtilities,
      connector: { id: '1', type: '.bedrock' },
      config: {
        apiUrl: DEFAULT_URL,
        defaultModel: 'claude',
      },
      secrets: { accessKey: '123', secret: '567' },
      logger,
      services: actionsMock.createServices(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: PROXY_URL_HTTP,
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });

    createConnector();
  });

  it('verifies that the Bedrock client is initialized with the custom proxy HTTP agent', () => {
    expect(nodeHttpHandlerMock).toHaveBeenCalledTimes(1);
    // Since DEFAULT_URL is https, only httpsAgent is passed, see: https://github.com/elastic/kibana/pull/224130#discussion_r2152632806
    // This is a whole-argument (not objectContaining) match, so it also pins that
    // no httpAgent is handed over. Keep it that way.
    expect(nodeHttpHandlerMock).toHaveBeenLastCalledWith({
      httpsAgent: expect.objectContaining({
        proxy: expect.objectContaining({
          host: `${PROXY_HOST}:${PROXY_PORT}`,
          hostname: PROXY_HOST,
          port: PROXY_PORT,
        }),
      }),
    });
  });

  it('verifies that the Bedrock client is initialized with the custom proxy HTTPS agent', () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: PROXY_URL_HTTPS,
      proxySSLSettings: {
        verificationMode: 'none',
      },
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
    });
    nodeHttpHandlerMock.mockClear();

    createConnector();

    // See note above: an https proxy URL still yields only an httpsAgent here.
    expect(nodeHttpHandlerMock).toHaveBeenCalledTimes(1);
    expect(nodeHttpHandlerMock).toHaveBeenLastCalledWith({
      httpsAgent: expect.objectContaining({
        proxy: expect.objectContaining({
          host: `${PROXY_HOST}:${PROXY_PORT}`,
          hostname: PROXY_HOST,
          port: PROXY_PORT,
        }),
      }),
    });
  });
});
