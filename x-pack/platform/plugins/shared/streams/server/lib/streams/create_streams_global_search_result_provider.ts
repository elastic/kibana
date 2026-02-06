/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IScopedClusterClient, Logger } from '@kbn/core/server';
import { from, takeUntil } from 'rxjs';
import type {
  GlobalSearchProviderResult,
  GlobalSearchResultProvider,
} from '@kbn/global-search-plugin/server';
import { Streams } from '@kbn/streams-schema';
import type { SearchHit } from '@kbn/es-types';
import { OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS } from '@kbn/management-settings-ids';
import {
  createStreamsStorageClient,
  type StreamsStorageClient,
} from './storage/streams_storage_client';
import { checkAccessBulk } from './stream_crud';

const streamTypes = ['classic stream', 'wired stream', 'stream'];

export function createStreamsGlobalSearchResultProvider(
  core: CoreSetup,
  logger: Logger
): GlobalSearchResultProvider {
  return {
    id: 'streams',
    getSearchableTypes: () => streamTypes,
    find: ({ term = '' as string, types = [] }, { aborted$, maxResults, client }) => {
      if (!client) {
        return from([]);
      }

      const storageClient = createStreamsStorageClient(client.asInternalUser, logger);

      return from(findStreams({ term, types, maxResults, storageClient, client, core })).pipe(
        takeUntil(aborted$)
      );
    },
  };
}

async function findStreams({
  term,
  types,
  maxResults,
  storageClient,
  client,
  core,
}: {
  term: string;
  types: string[];
  maxResults: number;
  storageClient: StreamsStorageClient;
  client: IScopedClusterClient;
  core: CoreSetup;
}) {
  const [coreStart] = await core.getStartServices();
  const soClient = coreStart.savedObjects.getUnsafeInternalClient();
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
  const queryStreamsEnabled = await uiSettingsClient.get(
    OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS
  );

  // This does NOT included unmanaged Classic streams
  const searchResponse = await storageClient.search({
    size: maxResults,
    track_total_hits: false,
    query: {
      bool: {
        should: [
          {
            wildcard: {
              name: {
                value: `*${term}*`,
                case_insensitive: true,
              },
            },
          },
          {
            match: {
              description: term,
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  });

  const hits = searchResponse.hits.hits.filter(
    ({ _source: definition }) => !('group' in definition)
  ); // Filter out old Group streams

  const privileges = await checkAccessBulk({
    names: hits.map((hit) => hit._source.name),
    scopedClusterClient: client,
  });

  const hitsWithAccess = searchResponse.hits.hits.filter((hit) => {
    if (Streams.QueryStream.Definition.is(hit._source)) return queryStreamsEnabled;
    return privileges[hit._source.name]?.read === true;
  });

  if (types.length === 0) {
    return hitsWithAccess.map((hit) => toGlobalSearchProviderResult(hit._id!, hit._source, term));
  }

  const relevantTypes = types.filter((type) => streamTypes.includes(type));
  if (relevantTypes.length === 0) {
    return [];
  }

  if (relevantTypes.includes('stream')) {
    return hitsWithAccess.map((hit) => toGlobalSearchProviderResult(hit._id!, hit._source, term));
  }

  const includeClassicStream = relevantTypes.includes('classic stream');
  const includeWiredStream = relevantTypes.includes('wired stream');
  const includeQueryStream = relevantTypes.includes('query stream');
  const includeStream = ({ _source }: SearchHit<Streams.all.Definition>) => {
    return (
      (includeClassicStream && Streams.ClassicStream.Definition.is(_source)) ||
      (includeWiredStream && Streams.WiredStream.Definition.is(_source)) ||
      (includeQueryStream && Streams.QueryStream.Definition.is(_source))
    );
  };

  return hitsWithAccess
    .filter(includeStream)
    .map((hit) => toGlobalSearchProviderResult(hit._id!, hit._source, term));
}

function toGlobalSearchProviderResult(
  id: string,
  definition: Streams.all.Definition,
  term: string
): GlobalSearchProviderResult {
  const type = Streams.ClassicStream.Definition.is(definition)
    ? 'Classic stream'
    : Streams.WiredStream.Definition.is(definition)
    ? 'Wired stream'
    : Streams.QueryStream.Definition.is(definition)
    ? 'Query stream'
    : 'Stream';

  return {
    id,
    score: scoreStream(definition.name.toLowerCase(), term.toLowerCase()),
    title: definition.name,
    type,
    url: `/app/streams/${definition.name}`,
  };
}

function scoreStream(name: string, searchTerm: string) {
  if (name === searchTerm) {
    return 85;
  } else if (name.startsWith(searchTerm)) {
    return 75;
  } else if (name.includes(searchTerm)) {
    return 65;
  }

  return 0;
}
