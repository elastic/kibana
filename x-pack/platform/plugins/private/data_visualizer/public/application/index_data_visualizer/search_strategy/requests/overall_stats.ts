/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { get } from 'lodash';
import type { Query } from '@kbn/es-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { AggCardinality } from '@kbn/ml-agg-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { getSafeAggregationName } from '@kbn/ml-query-utils';
import { buildAggregationWithSamplingOption } from './build_random_sampler_agg';
import { getDatafeedAggregations } from '../../../../../common/utils/datafeed_utils';
import type { AggregatableField, NonAggregatableField } from '../../types/overall_stats';
import type {
  Aggs,
  OverallStatsSearchStrategyParams,
  SamplingOption,
} from '../../../../../common/types/field_stats';
import { buildFilterCriteria } from '../../../../../common/utils/build_query_filters';

export const checkAggregatableFieldsExistRequest = (
  dataViewTitle: string,
  query: Query['query'],
  aggregatableFields: OverallStatsSearchStrategyParams['aggregatableFields'],
  samplingOption: SamplingOption,
  timeFieldName: string | undefined,
  earliestMs?: number | string,
  latestMs?: number | string,
  datafeedConfig?: estypes.MlDatafeed,
  runtimeMappings?: estypes.MappingRuntimeFields
): estypes.SearchRequest => {
  const index = dataViewTitle;
  const size = 0;
  const filterCriteria = buildFilterCriteria(timeFieldName, earliestMs, latestMs, query);
  const datafeedAggregations = getDatafeedAggregations(datafeedConfig);

  // Value count aggregation faster way of checking if field exists than using
  // filter aggregation with exists query.
  const aggs: Aggs = datafeedAggregations !== undefined ? { ...datafeedAggregations } : {};

  // Combine runtime fields from the data view as well as the datafeed
  const combinedRuntimeMappings: estypes.MappingRuntimeFields = {
    ...(isPopulatedObject(runtimeMappings) ? runtimeMappings : {}),
    ...(isPopulatedObject(datafeedConfig) && isPopulatedObject(datafeedConfig.runtime_mappings)
      ? datafeedConfig.runtime_mappings
      : {}),
  };

  aggregatableFields.forEach(({ name: field, supportedAggs }, i) => {
    const safeFieldName = getSafeAggregationName(field, i);

    if (supportedAggs.has('count')) {
      aggs[`${safeFieldName}_count`] = {
        filter: { exists: { field } },
      };
    }

    if (supportedAggs.has('cardinality')) {
      let cardinalityField: AggCardinality;
      if (Object.hasOwn(datafeedConfig?.script_fields ?? {}, field)) {
        cardinalityField = aggs[`${safeFieldName}_cardinality`] = {
          cardinality: { script: datafeedConfig?.script_fields![field].script },
        };
      } else {
        cardinalityField = {
          cardinality: { field },
        };
      }
      aggs[`${safeFieldName}_cardinality`] = cardinalityField;
    }
  });

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(isPopulatedObject(aggs)
      ? { aggs: buildAggregationWithSamplingOption(aggs, samplingOption) }
      : {}),
    ...(isPopulatedObject(combinedRuntimeMappings)
      ? { runtime_mappings: combinedRuntimeMappings }
      : {}),
  };

  return {
    index,
    // @ts-expect-error `track_total_hits` not allowed at top level for `typesWithBodyKey`
    track_total_hits: false,
    size,
    body: searchBody,
  };
};

export interface AggregatableFieldOverallStats extends IKibanaSearchResponse {
  aggregatableFields: OverallStatsSearchStrategyParams['aggregatableFields'];
}

export type NonAggregatableFieldOverallStats = IKibanaSearchResponse;

export function isAggregatableFieldOverallStats(
  arg: unknown
): arg is AggregatableFieldOverallStats {
  return isPopulatedObject(arg, ['aggregatableFields']);
}

export function isNonAggregatableFieldOverallStats(
  arg: unknown
): arg is NonAggregatableFieldOverallStats {
  return isPopulatedObject(arg, ['rawResponse']);
}

export function isNonAggregatableSampledDocs(
  arg: unknown
): arg is IKibanaSearchResponse<estypes.SearchResponse<unknown>> {
  return (
    isPopulatedObject(arg, ['rawResponse']) &&
    Object.hasOwn(arg.rawResponse as estypes.SearchResponse, 'hits')
  );
}

export const processAggregatableFieldsExistResponse = (
  responses: AggregatableFieldOverallStats[] | undefined,
  aggregatableFields: OverallStatsSearchStrategyParams['aggregatableFields'],
  populatedFieldsInIndex: Set<string> | null | undefined,
  datafeedConfig?: estypes.MlDatafeed
) => {
  const stats = {
    aggregatableExistsFields: [] as AggregatableField[],
    aggregatableNotExistsFields: [] as AggregatableField[],
  };

  if (!responses || aggregatableFields.length === 0) return stats;

  if (populatedFieldsInIndex) {
    aggregatableFields.forEach((field) => {
      if (!populatedFieldsInIndex.has(field.name)) {
        stats.aggregatableNotExistsFields.push({
          fieldName: field.name,
          existsInDocs: false,
          stats: {},
        });
      }
    });
  }
  responses.forEach(({ rawResponse: body, aggregatableFields: aggregatableFieldsChunk }) => {
    const aggregations = body.aggregations;

    const aggsPath = ['sample'];
    const sampleCount = get(aggregations, [...aggsPath, 'doc_count']);
    aggregatableFieldsChunk.forEach(({ name: field, supportedAggs }, i) => {
      const safeFieldName = getSafeAggregationName(field, i);
      // Sampler agg will yield doc_count that's bigger than the actual # of sampled records
      // because it uses the stored _doc_count if available
      // https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-doc-count-field.html
      // therefore we need to correct it by multiplying by the sampled probability
      const count = get(aggregations, [...aggsPath, `${safeFieldName}_count`, 'doc_count'], 0);
      const multiplier =
        count > sampleCount ? get(aggregations, [...aggsPath, 'probability'], 1) : 1;
      if (count > 0) {
        const cardinality = get(aggregations, [
          ...aggsPath,
          `${safeFieldName}_cardinality`,
          'value',
        ]);
        stats.aggregatableExistsFields.push({
          fieldName: field,
          existsInDocs: true,
          stats: {
            sampleCount,
            count: count * multiplier,
            cardinality,
          },
        });
      } else {
        if (
          Object.hasOwn(datafeedConfig?.script_fields ?? {}, field) ||
          Object.hasOwn(datafeedConfig?.runtime_mappings ?? {}, field)
        ) {
          const cardinality = get(aggregations, [
            ...aggsPath,
            `${safeFieldName}_cardinality`,
            'value',
          ]);
          stats.aggregatableExistsFields.push({
            fieldName: field,
            existsInDocs: true,
            stats: {
              sampleCount,
              count,
              cardinality,
            },
          });
        } else {
          stats.aggregatableNotExistsFields.push({
            fieldName: field,
            existsInDocs: false,
            stats: {},
          });
        }
      }
    });
  });

  return stats as {
    aggregatableExistsFields: AggregatableField[];
    aggregatableNotExistsFields: AggregatableField[];
  };
};

export const checkNonAggregatableFieldExistsRequest = (
  dataViewTitle: string,
  query: Query['query'],
  field: string,
  timeFieldName: string | undefined,
  earliestMs: number | string | undefined,
  latestMs: number | string | undefined,
  runtimeMappings?: estypes.MappingRuntimeFields
): estypes.SearchRequest => {
  const index = dataViewTitle;
  const size = 0;
  const filterCriteria = buildFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  if (Array.isArray(filterCriteria)) {
    filterCriteria.push({ exists: { field } });
  }

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
  };

  return {
    index,
    // @ts-expect-error `size` not allowed at top level for `typesWithBodyKey`
    size,
    body: searchBody,
    // Small es optimization
    // Since we only need to know if at least 1 doc exists for the query
    track_total_hits: 1,
  };
};

const DEFAULT_DOCS_SAMPLE_OF_TEXT_FIELDS_SIZE = 1000;

export const isUnsupportedVectorField = (fieldName: string) => {
  return fieldName.endsWith('.chunks.embeddings') || fieldName.endsWith('.chunks.offset');
};

export const getSampleOfDocumentsForNonAggregatableFields = (
  nonAggregatableFields: string[],
  dataViewTitle: string,
  query: Query['query'],
  timeFieldName: string | undefined,
  earliestMs: number | string | undefined,
  latestMs: number | string | undefined,
  runtimeMappings?: estypes.MappingRuntimeFields
): estypes.SearchRequest => {
  const index = dataViewTitle;
  const filterCriteria = buildFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  return {
    index,
    body: {
      fields: nonAggregatableFields.map((fieldName) => fieldName),
      _source: false,
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
      size: DEFAULT_DOCS_SAMPLE_OF_TEXT_FIELDS_SIZE,
    },
  };
};

export const processNonAggregatableFieldsExistResponse = (
  results: IKibanaSearchResponse[] | undefined,
  nonAggregatableFields: string[],
  nonAggregatableFieldsCount: number[],
  nonAggregatableFieldsUniqueCount: Array<Set<string>>,
  populatedNonAggregatableFields: string[]
) => {
  const stats = {
    nonAggregatableExistsFields: [] as NonAggregatableField[],
    nonAggregatableNotExistsFields: [] as NonAggregatableField[],
  };

  if (!results || nonAggregatableFields.length === 0) return stats;

  nonAggregatableFields.forEach((fieldName, fieldIdx) => {
    const idx = populatedNonAggregatableFields.indexOf(fieldName);

    if (idx === -1) {
      stats.nonAggregatableNotExistsFields.push({
        fieldName,
        existsInDocs: false,
        stats: {},
      });
      return;
    }
    if (isUnsupportedVectorField(fieldName)) {
      stats.nonAggregatableExistsFields.push({
        fieldName,
        existsInDocs: true,
        stats: {
          count: undefined,
          cardinality: undefined,
          sampleCount: undefined,
        },
      });
      return;
    }

    const foundField = results.find((r) => r.rawResponse.fieldName === fieldName);
    const existsInDocs = foundField !== undefined && foundField.rawResponse.hits.total > 0;

    const fieldData: NonAggregatableField = {
      fieldName,
      existsInDocs,
      stats: {
        count: nonAggregatableFieldsCount[idx] ?? 0,
        cardinality: nonAggregatableFieldsUniqueCount[idx]?.size ?? 0,
        sampleCount: DEFAULT_DOCS_SAMPLE_OF_TEXT_FIELDS_SIZE,
      },
    };
    stats.nonAggregatableExistsFields.push(fieldData);
  });
  return stats;
};
