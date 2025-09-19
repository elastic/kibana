/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { TruncatedDocumentAnalysis } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { format } from 'util';
import pLimit from 'p-limit';
import { compact, isEqual } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import { conditionToQueryDsl } from '@kbn/streamlang';
import { clusterDocs } from './cluster_docs';

export interface ClusterLogsResponse {
  sampled: number;
  noise: number[];
  clusters: Array<{ count: number; analysis: TruncatedDocumentAnalysis }>;
}

export async function clusterLogs({
  index,
  partitions,
  esClient,
  start,
  end,
  size = 1000,
  logger,
}: {
  index: string;
  partitions: Array<{ name: string; condition: Condition }>;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  size?: number;
  logger: Logger;
}): Promise<Array<{ name: string; condition: Condition; clustering: ClusterLogsResponse }>> {
  // time filter
  const rangeQuery = {
    range: {
      '@timestamp': { gte: start, lte: end, format: 'epoch_millis' },
    },
  };

  if (!isEqual(partitions[partitions.length - 1]?.condition, { always: {} })) {
    partitions.push({
      name: `Uncategorized logs`,
      condition: {
        always: {},
      },
    });
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

  const requests: Array<{ name: string; query: QueryDslQueryContainer }> = [];

  const fieldsToMap = new Set<string>();

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

  const fieldCaps = await esClient.fieldCaps({
    index,
    fields: '*',
    index_filter: { bool: { filter: [rangeQuery] } },
  });

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
          _source: false,
          fields: [{ field: '*', include_unmapped: true }],
          size,
          timeout: '5s',
          runtime_mappings: Object.fromEntries(
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

      const clustering = clusterDocs({
        hits: response.hits.hits,
        fieldCaps,
        logger,
      });

      return {
        name: partition.name,
        condition: partition.condition,
        clustering: {
          ...clustering,
          clusters: clustering.clusters.map((cluster) => {
            const { samples: _samples, ...rest } = cluster;
            return rest;
          }),
        },
      };
    })
  );
}
