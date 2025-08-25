/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { from, takeUntil } from 'rxjs';
import type {
  GlobalSearchProviderResult,
  GlobalSearchResultProvider,
} from '@kbn/global-search-plugin/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { Streams } from '@kbn/streams-schema';
import type { StreamsStorageClient, StreamsStorageSettings } from './service';
import { streamsStorageSettings } from './service';
import { migrateOnRead } from './helpers/migrate_on_read';
import { checkAccessBulk } from './stream_crud';

export function createStreamsGlobalSearchResultProvider(
  logger: Logger
): GlobalSearchResultProvider {
  return {
    id: 'streams',
    getSearchableTypes: () => ['classic stream', 'wired stream', 'group stream', 'stream'],
    find: ({ term = '' as string, types = [] }, { aborted$, maxResults, client }) => {
      if (!client) {
        return from([]);
      }

      const storageAdapter = new StorageIndexAdapter<
        StreamsStorageSettings,
        Streams.all.Definition
      >(client.asInternalUser, logger, streamsStorageSettings, {
        migrateSource: migrateOnRead,
      });
      const storageClient = storageAdapter.getClient();

      return from(findStreams({ term, types, maxResults, storageClient, client })).pipe(
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
}: {
  term: string;
  types: string[];
  maxResults: number;
  storageClient: StreamsStorageClient;
  client: IScopedClusterClient;
}) {
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

  const privileges = await checkAccessBulk({
    names: searchResponse.hits.hits
      .filter((hit) => !Streams.GroupStream.Definition.is(hit._source))
      .map((hit) => hit._source.name),
    scopedClusterClient: client,
  });

  const hitsWithAccess = searchResponse.hits.hits.filter((hit) => {
    if (Streams.GroupStream.Definition.is(hit._source)) return true;
    return privileges[hit._source.name]?.read === true;
  });

  const allStreams = types.includes('stream');
  const classicStreams = types.includes('classic stream');
  const wiredStreams = types.includes('wired stream');
  const groupStreams = types.includes('group stream');
  const noSubStreams = !classicStreams && !wiredStreams && !groupStreams;

  if (allStreams || noSubStreams) {
    return hitsWithAccess.map((hit) => toGlobalSearchProviderResult(hit._id!, hit._source, term));
  }

  const relevantStreams = hitsWithAccess.filter(({ _source }) => {
    return (
      (classicStreams && Streams.ClassicStream.Definition.is(_source)) ||
      (wiredStreams && Streams.WiredStream.Definition.is(_source)) ||
      (groupStreams && Streams.GroupStream.Definition.is(_source))
    );
  });

  return relevantStreams.map((hit) => toGlobalSearchProviderResult(hit._id!, hit._source, term));
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
    : Streams.GroupStream.Definition.is(definition)
    ? 'Group stream'
    : 'Stream';

  return {
    id,
    score: calculateTermScore(definition.name.toLowerCase(), term.toLowerCase()),
    title: definition.name,
    type,
    url: `/app/streams/${definition.name}/management/lifecycle`,
    icon: 'logsApp',
  };
}

function calculateTermScore(name: string, searchTerm: string) {
  if (!searchTerm) {
    return 80;
  } else if (name === searchTerm) {
    return 100;
  } else if (name.startsWith(searchTerm)) {
    return 90;
  } else if (name.includes(searchTerm)) {
    return 75;
  }

  return 50;
}
