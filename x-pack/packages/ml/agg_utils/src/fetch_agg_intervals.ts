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
 * Returns aggregation intervals for the supplied document fields.
 *
 * @param client - The Elasticsearch client.
 * @param indexPattern - The index pattern to search.
 * @param query - The query to filter documents.
 * @param fields - An array of field definitions for which aggregation intervals are requested.
 * @param samplerShardSize - The shard size parameter for sampling aggregations. A value less than 1 indicates no sampling.
 * @param runtimeMappings - Optional runtime mappings to apply.
 * @param abortSignal - Optional AbortSignal for canceling the request.
 * @param randomSamplerProbability - Optional probability value for random sampling.
 * @param randomSamplerSeed - Optional seed value for random sampling.
 * @returns A promise that resolves to a map of aggregation intervals for the specified fields.
 */
export const fetchAggIntervals = async (
  client: ElasticsearchClient,
  indexPattern: string,
  query: estypes.QueryDslQueryContainer,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings?: estypes.MappingRuntimeFields,
  abortSignal?: AbortSignal,
  randomSamplerProbability?: number,
  randomSamplerSeed?: number
): Promise<NumericColumnStatsMap> => {
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

  const body = await client.search(
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
