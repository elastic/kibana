/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
import {
  SearchParams,
  IndexDocumentParams,
  IndicesDeleteParams,
  IndicesCreateParams,
  APMSearchParams,
  APMSearchResponse
} from 'elasticsearch';
import { Legacy } from 'kibana';
import { cloneDeep, has, isString, set } from 'lodash';
import * as t from 'io-ts';
import { OBSERVER_VERSION_MAJOR } from '../../../common/elasticsearch_fieldnames';
import { StringMap } from '../../../typings/common';

function getApmIndices(config: Legacy.KibanaConfig) {
  return [
    config.get<string>('apm_oss.errorIndices'),
    config.get<string>('apm_oss.metricsIndices'),
    config.get<string>('apm_oss.onboardingIndices'),
    config.get<string>('apm_oss.sourcemapIndices'),
    config.get<string>('apm_oss.spanIndices'),
    config.get<string>('apm_oss.transactionIndices')
  ];
}

export function isApmIndex(
  apmIndices: string[],
  indexParam: SearchParams['index']
) {
  if (isString(indexParam)) {
    return apmIndices.includes(indexParam);
  } else if (Array.isArray(indexParam)) {
    // return false if at least one of the indices is not an APM index
    return indexParam.every(index => apmIndices.includes(index));
  }
  return false;
}

function addFilterForLegacyData(
  apmIndices: string[],
  params: SearchParams,
  { includeLegacyData = false } = {}
): SearchParams {
  // search across all data (including data)
  if (includeLegacyData || !isApmIndex(apmIndices, params.index)) {
    return params;
  }

  const nextParams = cloneDeep(params);
  if (!has(nextParams, 'body.query.bool.filter')) {
    set(nextParams, 'body.query.bool.filter', []);
  }

  // add filter for omitting pre-7.x data
  nextParams.body.query.bool.filter.push({
    range: { [OBSERVER_VERSION_MAJOR]: { gte: 7 } }
  });

  return nextParams;
}

// add additional params for search (aka: read) requests
async function getParamsForSearchRequest(
  req: Legacy.Request,
  params: SearchParams,
  apmOptions?: APMOptions
) {
  const config = req.server.config();
  const uiSettings = req.getUiSettingsService();
  const apmIndices = getApmIndices(config);
  const includeFrozen = await uiSettings.get('search:includeFrozen');
  return {
    ...addFilterForLegacyData(apmIndices, params, apmOptions), // filter out pre-7.0 data
    ignore_throttled: !includeFrozen, // whether to query frozen indices or not
    rest_total_hits_as_int: true // ensure that ES returns accurate hits.total with pre-6.6 format
  };
}

interface APMOptions {
  includeLegacyData: boolean;
}

// function search<T extends APMSearchParams, U extends t.Type<any, any, any>>(
//   params: T
// ): APMSearchResponse<T, U> {
//   return (null as unknown) as APMSearchResponse<T, U>;
// }

// const response = search({
//   body: {
//     aggs: {
//       foo: {
//         terms: {
//           field: 'bar'
//         }
//       }
//     }
//   }
// });

export function getESClient(req: Legacy.Request) {
  const cluster = req.server.plugins.elasticsearch.getCluster('data');
  const query = req.query as StringMap;

  return {
    search: async <T = null, U extends APMSearchParams = any>(
      params: U,
      apmOptions?: APMOptions
    ) => {
      const nextParams = await getParamsForSearchRequest(
        req,
        params,
        apmOptions
      );

      if (query._debug) {
        console.log(`--DEBUG ES QUERY--`);
        console.log(
          `${req.method.toUpperCase()} ${req.url.pathname} ${JSON.stringify(
            query
          )}`
        );
        console.log(`GET ${nextParams.index}/_search`);
        console.log(JSON.stringify(nextParams.body, null, 4));
      }

      type HitType = t.Type<T>;

      return cluster.callWithRequest(req, 'search', nextParams) as Promise<
        APMSearchResponse<U, HitType>
      >;
    },
    index: <Body>(params: IndexDocumentParams<Body>) => {
      return cluster.callWithRequest(req, 'index', params);
    },
    delete: (params: IndicesDeleteParams) => {
      return cluster.callWithRequest(req, 'delete', params);
    },
    indicesCreate: (params: IndicesCreateParams) => {
      return cluster.callWithRequest(req, 'indices.create', params);
    }
  };
}
