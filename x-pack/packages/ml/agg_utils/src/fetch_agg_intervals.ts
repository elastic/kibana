/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { stringHash } from '@kbn/ml-string-hash';

import { buildRandomSamplerAggregation } from './build_random_sampler_aggregation';
import { buildSamplerAggregation } from './build_sampler_aggregation';
import { getRandomSamplerAggregationsResponsePath } from './get_random_sampler_aggregations_response_path';
import { getSamplerAggregationsResponsePath } from './get_sampler_aggregations_response_path';
import type { HistogramField, NumericColumnStatsMap } from './types';

const MAX_CHART_COLUMNS = 20;

/**
 * Returns aggregation intervals for the supplied document fields.
 */
export const fetchAggIntervals = async (
  client: ElasticsearchClient,
  indexPattern: string,
  query: estypes.QueryDslQueryContainer,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings?: estypes.MappingRuntimeFields,
  abortSignal?: AbortSignal,
  randomSamplerProbability?: number
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

  const body = await client.search(
    {
      index: indexPattern,
      size: 0,
      body: {
        query,
        aggs:
          randomSamplerProbability === undefined
            ? buildSamplerAggregation(minMaxAggs, samplerShardSize)
            : buildRandomSamplerAggregation(minMaxAggs, randomSamplerProbability),
        size: 0,
        ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
      },
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  const aggsPath =
    randomSamplerProbability === undefined
      ? getSamplerAggregationsResponsePath(samplerShardSize)
      : getRandomSamplerAggregationsResponsePath(randomSamplerProbability);
  const aggregations = aggsPath.length > 0 ? get(body.aggregations, aggsPath) : body.aggregations;

  return Object.keys(aggregations).reduce((p, aggName) => {
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
