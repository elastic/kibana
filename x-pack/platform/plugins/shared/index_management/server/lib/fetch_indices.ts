/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { IndexDataEnricher } from '../services';
import type { Index } from '..';
import type { RouteDependencies } from '../types';
import type { MeteringStats } from './types';
import { fetchDocCount } from './fetch_doc_count';

interface MeteringStatsResponse {
  indices: MeteringStats[];
}

async function fetchIndicesCall(
  client: IScopedClusterClient,
  config: RouteDependencies['config'],
  indexNames?: string[]
): Promise<Index[]> {
  const indexNamesString = indexNames && indexNames.length ? indexNames.join(',') : '*';

  // This call retrieves alias and settings (incl. hidden status) information about indices
  const indices = await client.asCurrentUser.indices.get({
    index: indexNamesString,
    expand_wildcards: ['hidden', 'all'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: [
      '*.aliases',
      '*.settings.index.number_of_shards',
      '*.settings.index.number_of_replicas',
      '*.settings.index.frozen',
      '*.settings.index.hidden',
      '*.settings.index.mode',
      '*.data_stream',
    ],
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
  });

  if (!Object.keys(indices).length) {
    return [];
  }

  const indicesNames = Object.keys(indices);
  // System indices are excluded from the ES|QL doc count query because
  // they may require elevated privileges the current user doesn't have.
  const nonSystemIndices = indicesNames.filter((name) => !name.startsWith('.'));

  const safeDocCount = async (): Promise<Record<string, number>> => {
    if (nonSystemIndices.length === 0) {
      return {};
    }
    try {
      return await fetchDocCount(client.asCurrentUser, nonSystemIndices);
    } catch {
      return {};
    }
  };

  if (config.isIndexStatsEnabled) {
    const [{ indices: indicesStats }, docCounts] = await Promise.all([
      client.asCurrentUser.indices.stats({
        index: indexNamesString,
        expand_wildcards: ['hidden', 'all'],
        forbid_closed_indices: false,
        metric: ['docs', 'store'],
      }),
      safeDocCount(),
    ]);

    return indicesNames.map((indexName: string) => {
      const indexData = indices[indexName];
      const aliases = Object.keys(indexData.aliases!);
      const baseResponse = {
        name: indexName,
        primary: indexData.settings?.index?.number_of_shards,
        replica: indexData.settings?.index?.number_of_replicas,
        isFrozen: indexData.settings?.index?.frozen === 'true',
        aliases: aliases.length ? aliases : 'none',
        hidden: indexData.settings?.index?.hidden === 'true',
        data_stream: indexData.data_stream,
        mode: indexData.settings?.index?.mode,
      };

      if (indicesStats) {
        const indexStats = indicesStats[indexName];

        return {
          ...baseResponse,
          health: indexStats?.health,
          status: indexStats?.status,
          uuid: indexStats?.uuid,
          documents: docCounts[indexName] ?? indexStats?.primaries?.docs?.count ?? 0,
          documents_deleted: indexStats?.primaries?.docs?.deleted ?? 0,
          size: indexStats?.total?.store?.size_in_bytes ?? 0,
          primary_size: indexStats?.primaries?.store?.size_in_bytes ?? 0,
        };
      }

      return {
        ...baseResponse,
        documents: docCounts[indexName] ?? 0,
      };
    });
  }

  // uses the _metering/stats API to get the size of the index
  // and ES|QL to get accurate document counts
  // the _metering/stats API is only available in ES3 (serverless)
  if (config.isSizeAndDocCountEnabled) {
    const [{ indices: indicesStats }, docCounts] = await Promise.all([
      client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>({
        method: 'GET',
        path: `/_metering/stats/` + indexNamesString,
      }),
      safeDocCount(),
    ]);

    return indicesNames.map((indexName: string) => {
      const indexData = indices[indexName];
      const aliases = Object.keys(indexData.aliases!);
      const baseResponse = {
        name: indexName,
        isFrozen: false,
        aliases: aliases.length ? aliases : 'none',
        hidden: indexData.settings?.index?.hidden === 'true',
        data_stream: indexData.data_stream,
        mode: indexData.settings?.index?.mode,
      };

      if (indicesStats) {
        const indexStats = indicesStats.find((index) => index.name === indexName);

        return {
          ...baseResponse,
          documents: docCounts[indexName] ?? indexStats?.num_docs ?? 0,
          size: indexStats?.size_in_bytes ?? 0,
        };
      }

      return {
        ...baseResponse,
        documents: docCounts[indexName] ?? 0,
      };
    });
  }

  // if neither index stats (Stateful only API)
  // nor size and doc count are enabled (ES3 only API)
  // return the base response
  return indicesNames.map((indexName: string) => {
    const indexData = indices[indexName];
    const aliases = Object.keys(indexData.aliases!);
    return {
      name: indexName,
      primary: indexData.settings?.index?.number_of_shards,
      replica: indexData.settings?.index?.number_of_replicas,
      isFrozen: indexData.settings?.index?.frozen === 'true',
      aliases: aliases.length ? aliases : 'none',
      hidden: indexData.settings?.index?.hidden === 'true',
      data_stream: indexData.data_stream,
      mode: indexData.settings?.index?.mode,
    };
  });
}

export const fetchIndices = async ({
  client,
  indexDataEnricher,
  config,
  indexNames,
}: {
  client: IScopedClusterClient;
  indexDataEnricher: IndexDataEnricher;
  config: RouteDependencies['config'];
  indexNames?: string[];
}) => {
  const indices = await fetchIndicesCall(client, config, indexNames);
  return await indexDataEnricher.enrichIndices(indices, client);
};
