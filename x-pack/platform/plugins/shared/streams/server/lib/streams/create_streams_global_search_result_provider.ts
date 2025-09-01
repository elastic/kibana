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
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { Streams } from '@kbn/streams-schema';
import type { SearchHit } from '@kbn/es-types';
import { OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS } from '@kbn/management-settings-ids';
import type { StreamsStorageClient, StreamsStorageSettings } from './service';
import { streamsStorageSettings } from './service';
import { migrateOnRead } from './helpers/migrate_on_read';
import { checkAccessBulk } from './stream_crud';

const streamTypes = ['classic stream', 'wired stream', 'group stream', 'stream'];

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

      const storageAdapter = new StorageIndexAdapter<
        StreamsStorageSettings,
        Streams.all.Definition
      >(client.asInternalUser, logger, streamsStorageSettings, {
        migrateSource: migrateOnRead,
      });
      const storageClient = storageAdapter.getClient();

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
  const groupStreamsEnabled = await uiSettingsClient.get(
    OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS
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
    if (Streams.GroupStream.Definition.is(hit._source)) return groupStreamsEnabled;
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
  const includeGroupStream = relevantTypes.includes('group stream');
  const includeStream = ({ _source }: SearchHit<Streams.all.Definition>) => {
    return (
      (includeClassicStream && Streams.ClassicStream.Definition.is(_source)) ||
      (includeWiredStream && Streams.WiredStream.Definition.is(_source)) ||
      (includeGroupStream && Streams.GroupStream.Definition.is(_source))
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
    : Streams.GroupStream.Definition.is(definition)
    ? 'Group stream'
    : 'Stream';

  const score = Streams.GroupStream.Definition.is(definition)
    ? boostGroupStreamScore(definition.name.toLowerCase(), term.toLowerCase())
    : scoreStream(definition.name.toLowerCase(), term.toLowerCase());

  return {
    id,
    score,
    title: definition.name,
    type,
    url: `/app/streams/${definition.name}`,
  };
}

function boostGroupStreamScore(name: string, searchTerm: string) {
  if (name === searchTerm) {
    return 100;
  } else if (name.startsWith(searchTerm)) {
    return 90;
  } else if (name.includes(searchTerm)) {
    return 80;
  }

  return 0;
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
