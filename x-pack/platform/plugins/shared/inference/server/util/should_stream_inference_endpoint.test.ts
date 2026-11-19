/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { shouldStreamInferenceEndpoint } from './should_stream_inference_endpoint';

describe('shouldStreamInferenceEndpoint', () => {
  const logger = loggerMock.create();
  const streamingOff = async () => false;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.transport.request.mockResolvedValue([
      { service: 'openai', features: { non_streaming_chat: { supported: true } } },
      { service: 'googlevertexai', features: { non_streaming_chat: { supported: false } } },
      { service: 'anthropic' },
    ]);
  });

  it('streams without reading services when there is no setting reader or the setting is not explicitly off', async () => {
    await expect(
      shouldStreamInferenceEndpoint({ service: 'openai', esClient, logger })
    ).resolves.toBe(true);
    for (const settingValue of [true, undefined]) {
      await expect(
        shouldStreamInferenceEndpoint({
          service: 'openai',
          esClient,
          isStreamingEnabled: async () => settingValue as boolean,
          logger,
        })
      ).resolves.toBe(true);
    }
    expect(esClient.transport.request).not.toHaveBeenCalled();
  });

  it('does not stream when the setting is off and the service supports non-streaming', async () => {
    await expect(
      shouldStreamInferenceEndpoint({
        service: 'openai',
        esClient,
        isStreamingEnabled: streamingOff,
        logger,
      })
    ).resolves.toBe(false);
    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_inference/_services',
    });
  });

  it('streams when the service does not advertise non-streaming support', async () => {
    for (const service of ['anthropic', 'googlevertexai', 'unknown', undefined]) {
      await expect(
        shouldStreamInferenceEndpoint({
          service,
          esClient,
          isStreamingEnabled: streamingOff,
          logger,
        })
      ).resolves.toBe(true);
    }
  });

  it('streams when the setting or the services API cannot be read', async () => {
    await expect(
      shouldStreamInferenceEndpoint({
        service: 'openai',
        esClient,
        isStreamingEnabled: () => Promise.reject(new Error('settings down')),
        logger,
      })
    ).resolves.toBe(true);

    esClient.transport.request.mockRejectedValue(new Error('no permission'));
    await expect(
      shouldStreamInferenceEndpoint({
        service: 'openai',
        esClient,
        isStreamingEnabled: streamingOff,
        logger,
      })
    ).resolves.toBe(true);
  });
});
