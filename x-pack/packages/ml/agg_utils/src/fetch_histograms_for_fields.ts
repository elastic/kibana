/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import get from 'lodash/get';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { stringHash } from '@kbn/ml-string-hash';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { buildSamplerAggregation } from './build_sampler_aggregation';
import { fetchAggIntervals } from './fetch_agg_intervals';
import { getSamplerAggregationsResponsePath } from './get_sampler_aggregations_response_path';
import type {
  AggCardinality,
  HistogramField,
  NumericColumnStats,
  NumericColumnStatsMap,
} from './types';

const MAX_CHART_COLUMNS = 20;

interface AggHistogram {
  histogram: {
    field: string;
    interval: number;
  };
}

interface AggTerms {
  terms: {
    field: string;
    size: number;
  };
}

/**
 * Represents an item in numeric data.
 * @interface
 */
interface NumericDataItem {
  /**
   * The numeric key.
   */
  key: number;

  /**
   * An optional string representation of the key.
   */
  key_as_string?: string;

  /**
   * The document count associated with the key.
   */
  doc_count: number;
}

/**
 * Interface describing the data structure returned for numeric-based charts.
 * @interface
 */
export interface NumericChartData {
  /**
   * An array of data points, each represented by a NumericDataItem.
   */
  data: NumericDataItem[];

  /**
   * The identifier for the data set.
   */
  id: string;

  /**
   * The interval value for the data.
   */
  interval: number;

  /**
   * An array of statistics values, typically [min, max].
   */
  stats: [number, number];

  /**
   * The type of chart, which is 'numeric'.
   */
  type: 'numeric';
}

/**
 * Numeric based histogram field interface, limited to `date` and `number`.
 */
export interface NumericHistogramField extends HistogramField {
  /**
   * The type of the numeric histogram field.
   */
  type: KBN_FIELD_TYPES.DATE | KBN_FIELD_TYPES.NUMBER;
}
type NumericHistogramFieldWithColumnStats = NumericHistogramField & NumericColumnStats;

function isNumericHistogramField(arg: unknown): arg is NumericHistogramField {
  return (
    isPopulatedObject(arg, ['fieldName', 'type']) &&
    (arg.type === KBN_FIELD_TYPES.DATE || arg.type === KBN_FIELD_TYPES.NUMBER)
  );
}
function isNumericHistogramFieldWithColumnStats(
  arg: unknown
): arg is NumericHistogramFieldWithColumnStats {
  return (
    isPopulatedObject(arg, ['fieldName', 'type', 'min', 'max', 'interval']) &&
    (arg.type === KBN_FIELD_TYPES.DATE || arg.type === KBN_FIELD_TYPES.NUMBER)
  );
}

interface OrdinalDataItem {
  key: string;
  key_as_string?: string;
  doc_count: number;
}

interface OrdinalChartData {
  type: 'ordinal' | 'boolean';
  cardinality: number;
  data: OrdinalDataItem[];
  id: string;
}

interface OrdinalHistogramField extends HistogramField {
  type: KBN_FIELD_TYPES.STRING | KBN_FIELD_TYPES.BOOLEAN;
}

function isOrdinalHistogramField(arg: unknown): arg is OrdinalHistogramField {
  return (
    isPopulatedObject(arg, ['fieldName', 'type']) &&
    (arg.type === KBN_FIELD_TYPES.STRING || arg.type === KBN_FIELD_TYPES.BOOLEAN)
  );
}

interface UnsupportedChartData {
  id: string;
  type: 'unsupported';
}

interface UnsupportedHistogramField extends HistogramField {
  type: Exclude<
    KBN_FIELD_TYPES,
    KBN_FIELD_TYPES.STRING | KBN_FIELD_TYPES.BOOLEAN | KBN_FIELD_TYPES.DATE | KBN_FIELD_TYPES.NUMBER
  >;
}

type ChartRequestAgg = AggHistogram | AggCardinality | AggTerms;

/**
 * All types of histogram field definitions for fetching histogram data.
 */
export type FieldsForHistograms = Array<
  | NumericHistogramField
  | NumericHistogramFieldWithColumnStats
  | OrdinalHistogramField
  | UnsupportedHistogramField
>;

/**
 * Fetches data to be used in mini histogram charts. Supports auto-identifying
 * the histogram interval and min/max values.
 *
 * @param client Elasticsearch Client
 * @param indexPattern index pattern to be queried
 * @param query Elasticsearch query
 * @param fields the fields the histograms should be generated for
 * @param samplerShardSize shard_size parameter of the sampler aggregation
 * @param runtimeMappings optional runtime mappings
 * @param abortSignal optional abort signal
 * @param randomSamplerProbability optional random sampler probability
 * @param randomSamplerSeed optional random sampler seed
 * @returns an array of histogram data for each supplied field
 */
export const fetchHistogramsForFields = async (
  client: ElasticsearchClient,
  indexPattern: string,
  query: any,
  fields: FieldsForHistograms,
  samplerShardSize: number,
  runtimeMappings?: estypes.MappingRuntimeFields,
  abortSignal?: AbortSignal,
  randomSamplerProbability?: number,
  randomSamplerSeed?: number
) => {
  if (
    samplerShardSize >= 1 &&
    randomSamplerProbability !== undefined &&
    randomSamplerProbability < 1
  ) {
    throw new Error('Sampler and Random Sampler cannot be used at the same time.');
  }

  const aggIntervals = {
    ...(await fetchAggIntervals(
      client,
      indexPattern,
      query,
      fields.filter((f) => !isNumericHistogramFieldWithColumnStats(f)),
      samplerShardSize,
      runtimeMappings,
      abortSignal,
      randomSamplerProbability,
      randomSamplerSeed
    )),
    ...fields.filter(isNumericHistogramFieldWithColumnStats).reduce((p, field) => {
      const { interval, min, max, fieldName } = field;
      p[stringHash(fieldName)] = { interval, min, max };

      return p;
    }, {} as NumericColumnStatsMap),
  };

  const chartDataAggs = fields.reduce((aggs, field) => {
    const id = stringHash(field.fieldName);
    if (isNumericHistogramField(field)) {
      if (aggIntervals[id] !== undefined) {
        aggs[`${id}_histogram`] = {
          histogram: {
            field: field.fieldName,
            interval: aggIntervals[id].interval !== 0 ? aggIntervals[id].interval : 1,
          },
        };
      }
    } else if (isOrdinalHistogramField(field)) {
      if (field.type === KBN_FIELD_TYPES.STRING) {
        aggs[`${id}_cardinality`] = {
          cardinality: {
            field: field.fieldName,
          },
        };
      }
      aggs[`${id}_terms`] = {
        terms: {
          field: field.fieldName,
          size: MAX_CHART_COLUMNS,
        },
      };
    }
    return aggs;
  }, {} as Record<string, ChartRequestAgg>);

  if (Object.keys(chartDataAggs).length === 0) {
    return [];
  }

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
            ? buildSamplerAggregation(chartDataAggs, samplerShardSize)
            : wrap(chartDataAggs),
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

  return fields.map((field) => {
    const id = stringHash(field.fieldName);

    if (isNumericHistogramField(field)) {
      if (aggIntervals[id] === undefined) {
        return {
          type: 'numeric',
          data: [],
          interval: 0,
          stats: [0, 0],
          id: field.fieldName,
        } as NumericChartData;
      }

      return {
        data: aggregations[`${id}_histogram`].buckets,
        interval: aggIntervals[id].interval,
        stats: [aggIntervals[id].min, aggIntervals[id].max],
        type: 'numeric',
        id: field.fieldName,
      } as NumericChartData;
    } else if (isOrdinalHistogramField(field)) {
      return {
        type: field.type === KBN_FIELD_TYPES.STRING ? 'ordinal' : 'boolean',
        cardinality:
          field.type === KBN_FIELD_TYPES.STRING ? aggregations[`${id}_cardinality`].value : 2,
        data: aggregations[`${id}_terms`].buckets,
        id: field.fieldName,
      } as OrdinalChartData;
    }

    return {
      type: 'unsupported',
      id: field.fieldName,
    } as UnsupportedChartData;
  });
};
