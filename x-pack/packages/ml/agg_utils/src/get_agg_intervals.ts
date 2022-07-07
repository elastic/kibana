/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import type { Client } from '@elastic/elasticsearch';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { stringHash } from '@kbn/ml-string-hash';

import { buildSamplerAggregation } from './build_sampler_aggregation';
import { getSamplerAggregationsResponsePath } from './get_sampler_aggregations_response_path';

// TODO Temporary type definition until we can import from `@kbn/core`.
// Copied from src/core/server/elasticsearch/client/types.ts
// as these types aren't part of any package yet. Once they are, remove this completely

/**
 * Client used to query the elasticsearch cluster.
 * @deprecated At some point use the one from src/core/server/elasticsearch/client/types.ts when it is made into a package. If it never is, then keep using this one.
 * @public
 */
type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

const MAX_CHART_COLUMNS = 20;

interface HistogramField {
  fieldName: string;
  type: string;
}

interface NumericColumnStats {
  interval: number;
  min: number;
  max: number;
}
type NumericColumnStatsMap = Record<string, NumericColumnStats>;

/**
 * Returns aggregation intervals for the supplied document fields.
 */
export const getAggIntervals = async (
  client: ElasticsearchClient,
  indexPattern: string,
  query: estypes.QueryDslQueryContainer,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings?: estypes.MappingRuntimeFields
): Promise<NumericColumnStatsMap> => {
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

  const body = await client.search({
    index: indexPattern,
    size: 0,
    body: {
      query,
      aggs: buildSamplerAggregation(minMaxAggs, samplerShardSize),
      size: 0,
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    },
  });

  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
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
