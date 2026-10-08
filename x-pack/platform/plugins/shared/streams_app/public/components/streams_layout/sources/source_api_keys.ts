/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsAppStartDependencies } from '../../../types';
import { getSourceTypeSlug } from './source_helpers';
import type { ConfiguredSource, RevealedApiKey, SourceApiKey } from './types';

export interface SourceApiKeyServicesDeps {
  streamsRepositoryClient: StreamsAppStartDependencies['streams']['streamsRepositoryClient'];
}

export type SourceApiKeyGenerationDeps = SourceApiKeyServicesDeps;

export type SourceApiKeyPrivilegeFailure = 'none' | 'cluster' | 'source';

export interface SourceApiKeyPrivileges {
  canCreate: boolean;
  canList: boolean;
  failure: SourceApiKeyPrivilegeFailure;
}

export interface SourceApiKeyServices {
  load: (sourceId: string) => Promise<SourceApiKey[]>;
  checkPrivileges: (
    source: Pick<ConfiguredSource, 'id' | 'type'>
  ) => Promise<SourceApiKeyPrivileges>;
  generate: (source: ConfiguredSource) => Promise<RevealedApiKey>;
  delete: (sourceId: string, apiKeyId: string) => Promise<void>;
}

export const createSourceApiKeyServices = ({
  streamsRepositoryClient,
}: SourceApiKeyServicesDeps): SourceApiKeyServices => ({
  load: async (sourceId) => {
    const response = await streamsRepositoryClient.fetch('GET /internal/streams/sources/api_keys', {
      params: {
        query: { sourceId },
      },
      signal: null,
    });

    return response.apiKeys;
  },
  checkPrivileges: async (source) => {
    const response = await streamsRepositoryClient.fetch(
      'GET /internal/streams/sources/api_key/privileges',
      {
        params: {
          query: {
            sourceId: source.id,
            sourceTypeSlug: getSourceTypeSlug(source.type),
          },
        },
        signal: null,
      }
    );

    return {
      canCreate: response.canCreate,
      canList: response.canList,
      failure: response.failure,
    };
  },
  generate: async (source) => {
    const response = await streamsRepositoryClient.fetch('POST /internal/streams/sources/api_key', {
      params: {
        body: {
          sourceId: source.id,
          sourceTypeSlug: getSourceTypeSlug(source.type),
        },
      },
      signal: null,
    });

    return {
      id: response.id,
      name: response.name,
      createdAt: response.createdAt,
      encoded: response.encodedApiKey,
    };
  },
  delete: async (sourceId, apiKeyId) => {
    await streamsRepositoryClient.fetch('DELETE /internal/streams/sources/api_key', {
      params: {
        body: { sourceId, apiKeyId },
      },
      signal: null,
    });
  },
});
