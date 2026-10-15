/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsAppStartDependencies } from '../../../types';

export interface DestinationApiKeyServicesDeps {
  streamsRepositoryClient: StreamsAppStartDependencies['streams']['streamsRepositoryClient'];
}

export type DestinationApiKeyGenerationDeps = DestinationApiKeyServicesDeps;

export interface DestinationApiKey {
  id: string;
  name: string;
  createdAt: string;
  encoded: string;
}

export interface DestinationApiKeyServices {
  generate: (destinationId: string, patterns: string[]) => Promise<DestinationApiKey>;
  delete: (destinationId: string) => Promise<void>;
}

export const createDestinationApiKeyServices = ({
  streamsRepositoryClient,
}: DestinationApiKeyServicesDeps): DestinationApiKeyServices => ({
  generate: async (destinationId, patterns) => {
    const response = await streamsRepositoryClient.fetch(
      'POST /internal/streams/destinations/api_key',
      {
        params: {
          body: { destinationId, patterns },
        },
        signal: null,
      }
    );

    return {
      id: response.id,
      name: response.name,
      createdAt: response.createdAt,
      encoded: response.encodedApiKey,
    };
  },
  delete: async (destinationId) => {
    await streamsRepositoryClient.fetch('DELETE /internal/streams/destinations/api_key', {
      params: {
        body: { destinationId },
      },
      signal: null,
    });
  },
});
