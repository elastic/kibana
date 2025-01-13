/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs';
import type {
  IKibanaSearchResponse,
  IKibanaSearchRequest,
  ISearchOptions,
} from '@kbn/search-types';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { extractErrorProperties } from '@kbn/ml-error-utils';

import { processTopValues } from './utils';
import { buildAggregationWithSamplingOption } from './build_random_sampler_agg';
import type {
  Field,
  BooleanFieldStats,
  Aggs,
  FieldStatsCommonRequestParams,
  FieldStatsError,
} from '../../../../../common/types/field_stats';
import { isIKibanaSearchResponse } from '../../../../../common/types/field_stats';

export const getBooleanFieldsStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fields: Field[]
) => {
  const { index, query, runtimeFieldMap } = params;

  const size = 0;
  const aggs: Aggs = {};
  fields.forEach((field, i) => {
    const safeFieldName = field.safeFieldName;
    aggs[`${safeFieldName}_value_count`] = {
      filter: { exists: { field: field.fieldName } },
    };
    aggs[`${safeFieldName}_values`] = {
      terms: {
        field: field.fieldName,
        size: 2,
      },
    };
  });
  const searchBody = {
    query,
    aggs: buildAggregationWithSamplingOption(aggs, params.samplingOption),
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
  };

  return {
    index,
    size,
    body: searchBody,
  };
};

export const fetchBooleanFieldsStats = (
  dataSearch: ISearchStart,
  params: FieldStatsCommonRequestParams,
  fields: Field[],
  options: ISearchOptions
): Observable<BooleanFieldStats[] | FieldStatsError> => {
  const request: estypes.SearchRequest = getBooleanFieldsStatsRequest(params, fields);
  return dataSearch
    .search<IKibanaSearchRequest, IKibanaSearchResponse>({ params: request }, options)
    .pipe(
      catchError((e) =>
        of({
          fields,
          error: extractErrorProperties(e),
        } as FieldStatsError)
      ),
      map((resp) => {
        if (!isIKibanaSearchResponse(resp)) return resp;

        const aggregations = resp.rawResponse.aggregations;
        const aggsPath = ['sample'];
        const sampleCount = get(aggregations, [...aggsPath, 'doc_count'], 0);

        const batchStats: BooleanFieldStats[] = fields.map((field, i) => {
          const safeFieldName = field.fieldName;
          // Sampler agg will yield doc_count that's bigger than the actual # of sampled records
          // because it uses the stored _doc_count if available
          // https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-doc-count-field.html
          // therefore we need to correct it by multiplying by the sampled probability
          const count = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_value_count`, 'doc_count'],
            0
          );

          const fieldAgg = get(aggregations, [...aggsPath, `${safeFieldName}_values`], {});
          const { topValuesSampleSize, topValues } = processTopValues(fieldAgg);

          const multiplier =
            count > sampleCount ? get(aggregations, [...aggsPath, 'probability'], 1) : 1;

          const stats: BooleanFieldStats = {
            fieldName: field.fieldName,
            count: count * multiplier,
            trueCount: 0,
            falseCount: 0,
            topValues,
            topValuesSampleSize,
          };

          const valueBuckets: Array<{ [key: string]: number }> = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_values`, 'buckets'],
            []
          );
          valueBuckets.forEach((bucket) => {
            stats[`${bucket.key_as_string}Count` as 'trueCount' | 'falseCount'] = bucket.doc_count;
          });
          return stats;
        });

        return batchStats;
      })
    );
};
