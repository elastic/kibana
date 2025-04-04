/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const ENT_SEARCH_INDEX_PREFIX = '.ent-search-';
export const ENT_SEARCH_DATASTREAM_PREFIXES = [
  'logs-enterprise_search.',
  'logs-app_search.',
  'logs-workplace_search.',
];
export const ENT_SEARCH_DATASTREAM_PATTERN = [
  'logs-enterprise_search.*',
  'logs-app_search.*',
  'logs-workplace_search.*',
];

export interface EnterpriseSearchIndexMapping {
  name: string;
  hasDatastream: boolean;
  datastreams: string[];
}

function is7xIncompatibleIndex(indexData: IndicesIndexState): boolean {
  const isReadOnly = indexData.settings?.index?.verified_read_only ?? 'false';
  return Boolean(
    indexData.settings?.index?.version?.created?.startsWith('7') && isReadOnly !== 'true'
  );
}

export async function getPreEightEnterpriseSearchIndices(
  esClient: ElasticsearchClient
): Promise<EnterpriseSearchIndexMapping[]> {
  const entSearchIndices = await esClient.indices.get({
    index: `${ENT_SEARCH_INDEX_PREFIX}*`,
    ignore_unavailable: true,
    expand_wildcards: ['all', 'hidden'],
  });

  const returnIndices: EnterpriseSearchIndexMapping[] = [];

  for (const [index, indexData] of Object.entries(entSearchIndices)) {
    if (is7xIncompatibleIndex(indexData)) {
      const dataStreamName = indexData.data_stream;
      returnIndices.push({
        name: index,
        hasDatastream: dataStreamName ? true : false,
        datastreams: [dataStreamName ?? ''],
      });
    }
  }

  const { data_streams: entSearchDatastreams } = await esClient.indices.getDataStream({
    name: ENT_SEARCH_DATASTREAM_PATTERN.join(','),
    expand_wildcards: ['all', 'hidden'],
  });

  const dsIndices = new Set<string>();
  entSearchDatastreams.forEach(({ indices: dsi }) => {
    dsi.forEach(({ index_name: indexName }) => {
      dsIndices.add(indexName);
    });
  });

  if (!dsIndices.size) return returnIndices;

  for (const returnIndex of returnIndices) {
    if (dsIndices.has(returnIndex.name)) {
      dsIndices.delete(returnIndex.name);
    }
  }

  if (!dsIndices.size) return returnIndices;

  const entSearchDsIndices = await esClient.indices.get({
    index: Array.from(dsIndices.values()),
    ignore_unavailable: true,
  });

  for (const [index, indexData] of Object.entries(entSearchDsIndices)) {
    if (is7xIncompatibleIndex(indexData)) {
      const dataStreamName = indexData.data_stream;
      returnIndices.push({
        name: index,
        hasDatastream: dataStreamName ? true : false,
        datastreams: [dataStreamName ?? ''],
      });
    }
  }

  return returnIndices;
}

export async function setPreEightEnterpriseSearchIndicesReadOnly(
  esClient: ElasticsearchClient
): Promise<string> {
  // get the indices again to ensure nothing's changed since the last check
  let indices = await getPreEightEnterpriseSearchIndices(esClient);

  // rollover any datastreams first
  const rolledOverDatastreams: { [id: string]: boolean } = {};
  for (const index of indices) {
    if (index.hasDatastream) {
      for (const datastream of index.datastreams) {
        if (datastream.length === 0 || rolledOverDatastreams[datastream]) {
          continue;
        }

        const indexResponse = await esClient.indices.rollover({ alias: datastream });

        if (!indexResponse) {
          return `Could not roll over datastream: ${index.name}`;
        }

        rolledOverDatastreams[datastream] = true;
      }
    }
  }

  if (Object.keys(rolledOverDatastreams).length > 0) {
    // we rolled over at least one datastream,
    // get the indices again
    indices = await getPreEightEnterpriseSearchIndices(esClient);
  }

  for (const index of indices) {
    const indexName = index.name;
    const indexResponse = await esClient.indices.addBlock({ index: indexName, block: 'write' });

    if (!indexResponse || indexResponse.acknowledged !== true) {
      return `Could not set index read-only: ${indexName}`;
    }
  }

  return '';
}
