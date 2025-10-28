/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { TruncatedDocumentAnalysis } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Condition } from '@kbn/streamlang';
import { conditionToQueryDsl } from '@kbn/streamlang';
import { format } from 'util';
import pLimit from 'p-limit';
import { compact, isEqual } from 'lodash';
import { clusterSampleDocs } from './cluster_sample_docs';

export interface ClusterLogsResponse {
  sampled: number;
  noise: number[];
  clusters: Array<{ count: number; analysis: TruncatedDocumentAnalysis }>;
}

function getFields(condition: Condition): string[] {
  if ('field' in condition) {
    return [condition.field];
  }

  if ('and' in condition) {
    return condition.and.flatMap(getFields);
  }
  if ('or' in condition) {
    return condition.or.flatMap(getFields);
  }

  return [];
}

/**
 * Cluster Elasticsearch documents by:
 * - getting 1000 docs per specified partition
 * - per result set, create clusters by using DBSCAN and Jaccard similarity
 *
 * Each cluster has its own document analysis.
 */
export async function clusterLogs({
  index,
  partitions,
  esClient,
  start,
  end,
  size = 1000,
  logger,
  dropUnmapped = false,
}: {
  index: string;
  partitions: Array<{ name: string; condition: Condition }>;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  size?: number;
  logger: Logger;
  dropUnmapped?: boolean;
}): Promise<Array<{ name: string; condition: Condition; clustering: ClusterLogsResponse }>> {
  // time filter
  const rangeQuery = {
    range: {
      '@timestamp': { gte: start, lte: end, format: 'epoch_millis' },
    },
  };

  // append an "uncategorized" partition if it does not exist yet
  if (!isEqual(partitions[partitions.length - 1]?.condition, { always: {} })) {
    partitions.push({
      name: `Uncategorized logs`,
      condition: {
        always: {},
      },
    });
  }

  const requests: Array<{ name: string; query: QueryDslQueryContainer }> = [];

  // extract used fields to create runtime_mappings
  const fieldsToMap = new Set<string>();

  // create requests for exclusive partitions (data only ends up in single bucket)
  partitions.forEach((partition, idx) => {
    const fields = getFields(partition.condition);
    fields.forEach((field) => fieldsToMap.add(field));

    const prevPartitions = partitions.slice(0, idx);

    requests.push({
      name: partition.name,
      query: {
        bool: {
          filter: [conditionToQueryDsl(partition.condition), rangeQuery],
          must_not: prevPartitions.map((prev) => conditionToQueryDsl(prev.condition)),
        },
      },
    });
  });

  // get mapped fields for specified index
  const fieldCaps = await esClient.fieldCaps({
    index,
    fields: '*',
    index_filter: { bool: { filter: [rangeQuery] } },
  });

  // collect fields that are used in the filters, but unmapped
  const unmappedFields = Array.from(fieldsToMap).filter((field) => {
    return fieldCaps.fields[field] === undefined;
  });

  const limiter = pLimit(5);

  // 1) fetch fieldCaps + random sample
  const sampledDocsResponses = await Promise.all(
    requests.map((request) => {
      return limiter(() => {
        const requestBody = {
          index,
          _source: true,
          size,
          timeout: '5s',
          // add runtime mappings so fields are queryable
          runtime_mappings: dropUnmapped
            ? {}
            : Object.fromEntries(
                Array.from(unmappedFields).map((field) => {
                  return [
                    field,
                    {
                      type: 'keyword' as const,
                    },
                  ];
                })
              ),
          query: {
            bool: {
              must: [request.query],
              // randomize data set
              should: [{ function_score: { functions: [{ random_score: {} }] } }],
            },
          },
        };
        return esClient.search<Record<string, unknown>>(requestBody);
      });
    })
  );

  return compact(
    partitions.map((partition, idx) => {
      const response = sampledDocsResponses[idx];

      if (!response || !response.hits || !response.hits.hits) {
        logger.warn(
          `Response for ${format(partition)} expected at ${idx}, but not found (value was ${format(
            response
          )}). Num responses was ${sampledDocsResponses.length}`
        );

        return null;
      }

      const clustering = clusterSampleDocs({
        hits: response.hits.hits,
        fieldCaps,
        dropUnmapped,
      });

      return {
        name: partition.name,
        condition: partition.condition,
        clustering: {
          ...clustering,
          // drop the samples to reduce the payload
          clusters: clustering.clusters.map((cluster) => {
            const { samples: _samples, ...rest } = cluster;
            return rest;
          }),
        },
      };
    })
  );
}
