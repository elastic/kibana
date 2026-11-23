/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { supportsNonStreamingChat, type InferenceProvider } from '@kbn/inference-common';

/**
 * Decides whether an inference endpoint should be called with `_stream`.
 *
 * Streaming is the default. Non-streaming is only used when the space setting turns streaming
 * off AND the endpoint's service advertises `features.non_streaming_chat.supported` in
 * `GET _inference/_services`, so the toggle never sends a request Elasticsearch would reject.
 * Any failure to verify either condition falls back to streaming.
 */
export const shouldStreamInferenceEndpoint = async ({
  service,
  esClient,
  isStreamingEnabled,
  logger,
}: {
  service?: string;
  esClient: ElasticsearchClient;
  /** Reads the space setting; absent when there is no request to read it from. */
  isStreamingEnabled?: () => Promise<boolean>;
  logger: Logger;
}): Promise<boolean> => {
  if (!isStreamingEnabled || !service) {
    return true;
  }
  try {
    // only an explicit opt-out disables streaming; an unset setting keeps the default
    if ((await isStreamingEnabled()) !== false) {
      return true;
    }
    const services = await esClient.transport.request<
      Array<Pick<InferenceProvider, 'service' | 'features'>>
    >({ method: 'GET', path: '/_inference/_services' });
    const provider = Array.isArray(services)
      ? services.find((candidate) => candidate.service === service)
      : undefined;
    if (!supportsNonStreamingChat(provider)) {
      logger.debug(
        `Streaming is disabled but inference service [${service}] does not advertise non-streaming chat completion support, streaming`
      );
      return true;
    }
    logger.debug(`Streaming is disabled, calling inference service [${service}] without _stream`);
    return false;
  } catch (error) {
    logger.warn(
      `Could not resolve the inference streaming mode, falling back to streaming: ${error.message}`
    );
    return true;
  }
};
