/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import get from 'lodash/get';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { stringHash } from '@kbn/ml-string-hash';

import { buildSamplerAggregation } from './build_sampler_aggregation';
import { fetchAggIntervals } from './fetch_agg_intervals';
import { getSamplerAggregationsResponsePath } from './get_sampler_aggregations_response_path';
import type { AggCardinality, ElasticsearchClient } from './types';

const MAX_CHART_COLUMNS = 20;

interface HistogramField {
  fieldName: string;
  type: string;
}

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

interface NumericDataItem {
  key: number;
  key_as_string?: string;
  doc_count: number;
}

interface NumericChartData {
  data: NumericDataItem[];
  id: string;
  interval: number;
  stats: [number, number];
  type: 'numeric';
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

interface UnsupportedChartData {
  id: string;
  type: 'unsupported';
}

type ChartRequestAgg = AggHistogram | AggCardinality | AggTerms;

// type ChartDataItem = NumericDataItem | OrdinalDataItem;
type ChartData = NumericChartData | OrdinalChartData | UnsupportedChartData;

export const fetchHistogramsForFields = async (
  client: ElasticsearchClient,
  indexPattern: string,
  query: any,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const aggIntervals = await fetchAggIntervals(
    client,
    indexPattern,
    query,
    fields,
    samplerShardSize,
    runtimeMappings
  );

  const chartDataAggs = fields.reduce((aggs, field) => {
    const fieldName = field.fieldName;
    const fieldType = field.type;
    const id = stringHash(fieldName);
    if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
      if (aggIntervals[id] !== undefined) {
        aggs[`${id}_histogram`] = {
          histogram: {
            field: fieldName,
            interval: aggIntervals[id].interval !== 0 ? aggIntervals[id].interval : 1,
          },
        };
      }
    } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
      if (fieldType === KBN_FIELD_TYPES.STRING) {
        aggs[`${id}_cardinality`] = {
          cardinality: {
            field: fieldName,
          },
        };
      }
      aggs[`${id}_terms`] = {
        terms: {
          field: fieldName,
          size: MAX_CHART_COLUMNS,
        },
      };
    }
    return aggs;
  }, {} as Record<string, ChartRequestAgg>);

  if (Object.keys(chartDataAggs).length === 0) {
    return [];
  }

  const body = await client.search(
    {
      index: indexPattern,
      size: 0,
      body: {
        query,
        aggs: buildSamplerAggregation(chartDataAggs, samplerShardSize),
        size: 0,
        ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
      },
    },
    { maxRetries: 0 }
  );

  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const aggregations = aggsPath.length > 0 ? get(body.aggregations, aggsPath) : body.aggregations;

  const chartsData: ChartData[] = fields.map((field): ChartData => {
    const fieldName = field.fieldName;
    const fieldType = field.type;
    const id = stringHash(field.fieldName);

    if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
      if (aggIntervals[id] === undefined) {
        return {
          type: 'numeric',
          data: [],
          interval: 0,
          stats: [0, 0],
          id: fieldName,
        };
      }

      return {
        data: aggregations[`${id}_histogram`].buckets,
        interval: aggIntervals[id].interval,
        stats: [aggIntervals[id].min, aggIntervals[id].max],
        type: 'numeric',
        id: fieldName,
      };
    } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
      return {
        type: fieldType === KBN_FIELD_TYPES.STRING ? 'ordinal' : 'boolean',
        cardinality:
          fieldType === KBN_FIELD_TYPES.STRING ? aggregations[`${id}_cardinality`].value : 2,
        data: aggregations[`${id}_terms`].buckets,
        id: fieldName,
      };
    }

    return {
      type: 'unsupported',
      id: fieldName,
    };
  });

  return chartsData;
};
