/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

const ENT_SEARCH_INDEX_PREFIX = '.ent-search-';
const ENT_SEARCH_DATASTREAM_PATTERN = [
  'logs-enterprise_search.*',
  'logs-app_search.*',
  'logs-workplace_search.*',
];

export interface EnterpriseSearchIndexMapping {
  name: string;
  hasDatastream: boolean;
  datastreams: string[];
}

export async function getPreEightEnterpriseSearchIndices(
  esClient: ElasticsearchClient
): Promise<EnterpriseSearchIndexMapping[]> {
  const entSearchIndices = await esClient.indices.get({
    index: `${ENT_SEARCH_INDEX_PREFIX}*`,
    ignore_unavailable: true,
    expand_wildcards: ['all', 'hidden'],
  });

  const entSearchDatastreams = await esClient.indices.getDataStream({
    name: ENT_SEARCH_DATASTREAM_PATTERN.join(','),
    expand_wildcards: ['all', 'hidden'],
  });

  const returnIndices: EnterpriseSearchIndexMapping[] = [];
  for (const [index, indexData] of Object.entries(entSearchIndices)) {
    const isReadOnly = indexData.settings?.index?.verified_read_only ?? 'false';
    if (indexData.settings?.index?.version?.created?.startsWith('7') && isReadOnly !== 'true') {
      const dataStreamName = indexData.data_stream;
      returnIndices.push({
        name: index,
        hasDatastream: dataStreamName ? true : false,
        datastreams: [dataStreamName ?? ''],
      });
    }
  }

  for (const [datastream, datastreamData] of Object.entries(entSearchDatastreams)) {
    if (!datastreamData.indices || datastreamData.indices.length === 0) {
      continue;
    }

    // only get the last index, as this the current write index
    const lastIndexName = datastreamData.indices[datastreamData.indices.length - 1].index_name;
    const existingIndex = returnIndices.find((index) => index.name === lastIndexName);
    if (existingIndex) {
      existingIndex.hasDatastream = true;
      existingIndex.datastreams.push(datastream);
    } else {
      returnIndices.push({
        name: lastIndexName,
        hasDatastream: true,
        datastreams: [datastream],
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
