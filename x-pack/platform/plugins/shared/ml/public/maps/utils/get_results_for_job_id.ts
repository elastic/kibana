/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { estypes } from '@elastic/elasticsearch';
import type { VectorSourceRequestMeta } from '@kbn/maps-plugin/common';
import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import type { ESSearchResponse } from '@kbn/es-types';
import { type MLAnomalyDoc } from '@kbn/ml-anomaly-utils';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import type { MlApi } from '@kbn/ml-services/ml_api_service';
import { getIndexPattern, type ExplorerJob } from '../../application/explorer/explorer_utils';
import { ML_ANOMALY_LAYERS, type MlAnomalyLayersType } from './constants';
import { getCoordinates } from './get_coordinates';

export async function getResultsForJobId(
  mlResultsService: MlApi['results'],
  jobId: string,
  locationType: MlAnomalyLayersType,
  searchFilters: VectorSourceRequestMeta
): Promise<FeatureCollection> {
  const { query, timeFilters } = searchFilters;
  const hasQuery = query && query.query !== '';
  let queryFilter;

  const indexPattern = getIndexPattern([{ id: jobId }] as ExplorerJob[]);

  if (hasQuery && query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
    queryFilter = toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
  } else if (hasQuery && query?.language === SEARCH_QUERY_LANGUAGE.LUCENE) {
    queryFilter = luceneStringToDsl(query.query);
  }

  const must: estypes.QueryDslQueryContainer[] = [
    { term: { job_id: jobId } },
    { term: { result_type: 'record' } },
  ];

  let bool: estypes.QueryDslBoolQuery = {
    must,
  };

  if (queryFilter && queryFilter.bool) {
    bool = { ...bool, ...queryFilter.bool };
  } else if (queryFilter) {
    // @ts-ignore push doesn't exist on type QueryDslQueryContainer | QueryDslQueryContainer[] | undefined
    bool.must.push(queryFilter);
  }

  // Query to look for the highest scoring anomaly.
  const body: estypes.SearchRequest = {
    query: {
      bool,
    },
    size: 1000,
    _source: {
      excludes: [],
    },
  };

  if (timeFilters) {
    const timerange = {
      range: {
        timestamp: {
          gte: `${timeFilters.from}`,
          lte: timeFilters.to,
        },
      },
    };
    must.push(timerange);
  }

  let resp: ESSearchResponse<MLAnomalyDoc> | null = null;

  try {
    resp = await mlResultsService.anomalySearch(body, [jobId]);
  } catch (error) {
    // search may fail if the job doesn't already exist
    // ignore this error as the outer function call will raise a toast
  }

  const features: Feature[] =
    resp?.hits.hits.map(({ _source }) => {
      const geoResults = _source.geo_results;
      const actual =
        geoResults && geoResults.actual_point ? getCoordinates(geoResults.actual_point) : [0, 0];
      const typical =
        geoResults && geoResults.typical_point ? getCoordinates(geoResults.typical_point) : [0, 0];

      let geometry: Geometry;
      if (locationType === ML_ANOMALY_LAYERS.TYPICAL || locationType === ML_ANOMALY_LAYERS.ACTUAL) {
        geometry = {
          type: 'Point',
          coordinates: locationType === ML_ANOMALY_LAYERS.TYPICAL ? typical : actual,
        };
      } else {
        geometry = {
          type: 'LineString',
          coordinates: [typical, actual],
        };
      }

      const splitFields = {
        ...(_source.partition_field_name
          ? { [_source.partition_field_name]: _source.partition_field_value }
          : {}),
        ...(_source.by_field_name ? { [_source.by_field_name]: _source.by_field_value } : {}),
        ...(_source.over_field_name ? { [_source.over_field_name]: _source.over_field_value } : {}),
      };

      const splitFieldKeys = Object.keys(splitFields);
      const influencers = _source.influencers
        ? _source.influencers.filter(
            ({ influencer_field_name: name, influencer_field_values: values }) => {
              // remove influencers without values and influencers on partition fields
              return values.length && !splitFieldKeys.includes(name);
            }
          )
        : [];

      return {
        type: 'Feature',
        geometry,
        properties: {
          actual,
          typical,
          fieldName: _source.field_name,
          functionDescription: _source.function_description,
          timestamp: formatHumanReadableDateTimeSeconds(_source.timestamp),
          record_score: Math.floor(_source.record_score),
          ...(Object.keys(splitFields).length > 0 ? splitFields : {}),
          ...(influencers.length
            ? {
                influencers,
              }
            : {}),
        },
      };
    }) || [];

  return {
    type: 'FeatureCollection',
    features,
  };
}
