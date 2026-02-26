/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Relationship } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export interface RelationshipsFetchResult {
  relationships: Relationship[];
  total: number;
}

export const useRelationshipsFetch = ({ streamName }: { streamName: string }) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const relationshipsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const response = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/relationships',
        {
          signal,
          params: {
            path: {
              name: streamName,
            },
          },
        }
      );
      return response as RelationshipsFetchResult;
    },
    [streamName, streamsRepositoryClient]
  );

  return relationshipsFetch;
};
