/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { stringHash } from '@kbn/ml-string-hash';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { buildSamplerAggregation } from './build_sampler_aggregation';
import { getSamplerAggregationsResponsePath } from './get_sampler_aggregations_response_path';
import type { HistogramField, NumericColumnStatsMap } from './types';

const MAX_CHART_COLUMNS = 20;

/**
 * Interface for the parameters required to fetch aggregation intervals.
 */
export interface FetchAggIntervalsParams {
  /** The Elasticsearch client to use for the query. */
  esClient: ElasticsearchClient;
  /** An optional abort signal to cancel the request. */
  abortSignal?: AbortSignal;
  /** The arguments for the aggregation query. */
  arguments: {
    /** The index pattern to query against. */
    indexPattern: string;
    /** The query to filter documents. */
    query: estypes.QueryDslQueryContainer;
    /** The fields to aggregate on. */
    fields: HistogramField[];
    /** The size of the sampler shard. */
    samplerShardSize: number;
    /** Optional runtime mappings for the query. */
    runtimeMappings?: estypes.MappingRuntimeFields;
    /** Optional probability for random sampling. */
    randomSamplerProbability?: number;
    /** Optional seed for random sampling. */
    randomSamplerSeed?: number;
  };
}
/**
 * Asynchronously fetches aggregation intervals from an Elasticsearch client.
 *
 * @param params - The parameters for fetching aggregation intervals.
 * @returns A promise that resolves to a map of numeric column statistics.
 */
export const fetchAggIntervals = async (
  params: FetchAggIntervalsParams
): Promise<NumericColumnStatsMap> => {
  const { esClient, abortSignal, arguments: args } = params;
  const {
    indexPattern,
    query,
    fields,
    samplerShardSize,
    runtimeMappings,
    randomSamplerProbability,
    randomSamplerSeed,
  } = args;

  if (
    samplerShardSize >= 1 &&
    randomSamplerProbability !== undefined &&
    randomSamplerProbability < 1
  ) {
    throw new Error('Sampler and Random Sampler cannot be used at the same time.');
  }

  const numericColumns = fields.filter((field) => {
    return field.type === KBN_FIELD_TYPES.NUMBER || field.type === KBN_FIELD_TYPES.DATE;
  });

  if (numericColumns.length === 0) {
    return {};
  }

  const minMaxAggs = numericColumns.reduce((aggs, c) => {
    const id = stringHash(c.fieldName);
    aggs[id] = {
      stats: {
        field: c.fieldName,
      },
    };
    return aggs;
  }, {} as Record<string, object>);

  const { wrap, unwrap } = createRandomSamplerWrapper({
    probability: randomSamplerProbability ?? 1,
    seed: randomSamplerSeed,
  });

  const body = await esClient.search(
    {
      index: indexPattern,
      size: 0,
      body: {
        query,
        aggs:
          randomSamplerProbability === undefined
            ? buildSamplerAggregation(minMaxAggs, samplerShardSize)
            : wrap(minMaxAggs),
        size: 0,
        ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
      },
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  const aggsPath =
    randomSamplerProbability === undefined
      ? getSamplerAggregationsResponsePath(samplerShardSize)
      : [];
  const aggregations =
    aggsPath.length > 0
      ? get(body.aggregations, aggsPath)
      : randomSamplerProbability !== undefined && body.aggregations !== undefined
      ? unwrap(body.aggregations)
      : body.aggregations;

  return Object.keys(aggregations).reduce((p, aggName) => {
    if (aggregations === undefined) {
      return p;
    }

    const stats = [aggregations[aggName].min, aggregations[aggName].max];
    if (!stats.includes(null)) {
      const delta = aggregations[aggName].max - aggregations[aggName].min;

      let aggInterval = 1;

      if (delta > MAX_CHART_COLUMNS || delta <= 1) {
        aggInterval = delta / (MAX_CHART_COLUMNS - 1);
      }

      p[aggName] = { interval: aggInterval, min: stats[0], max: stats[1] };
    }

    return p;
  }, {} as NumericColumnStatsMap);
};
