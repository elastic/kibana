/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fields } from '@elastic/elasticsearch/lib/api/types';
import { type ElasticsearchClient } from '@kbn/core/server';

interface RetrieveFieldCapsProps {
  esClient: ElasticsearchClient;
  indexPattern: string;
  fields?: Fields;
  to?: string;
  from?: string;
}

export async function retrieveFieldCaps({
  esClient,
  indexPattern,
  fields = '*',
  to,
  from,
}: RetrieveFieldCapsProps) {
  // Build index_filter for time range if provided
  let indexFilter: any;
  if (from && to) {
    indexFilter = {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
        },
      },
    };
  }
  // First, resolve the index pattern to get data streams
  const resolveResponse = await esClient.indices.resolveIndex({
    name: indexPattern,
    expand_wildcards: 'all',
  });

  // Extract data stream names
  const dataStreams = resolveResponse.data_streams || [];

  if (dataStreams.length === 0) {
    return [];
  }

  // Call field caps in parallel for each data stream
  const fieldCapsPromises = dataStreams.map(async (dataStream) => {
    try {
      const fieldCaps = await esClient.fieldCaps({
        index: dataStream.name,
        fields,
        include_unmapped: false,
        index_filter: indexFilter,
        types: [
          // Numeric types for metrics
          'long',
          'integer',
          'short',
          'byte',
          'double',
          'float',
          'half_float',
          'scaled_float',
          'unsigned_long',
          'histogram',
          // String types for dimensions
          'keyword',
        ],
      });

      return {
        dataStreamName: dataStream.name,
        fieldCaps: fieldCaps.fields || {},
      };
    } catch {
      // Error handling for field caps fetch
      return {
        dataStreamName: dataStream.name,
        fieldCaps: {},
      };
    }
  });

  // Wait for all field caps requests to complete
  return Promise.all(fieldCapsPromises);
}
