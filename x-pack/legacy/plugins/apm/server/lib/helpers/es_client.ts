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
  IndicesCreateParams
} from 'elasticsearch';
import { Legacy } from 'kibana';
import { cloneDeep, has, isString, set, pick } from 'lodash';
import { OBSERVER_VERSION_MAJOR } from '../../../common/elasticsearch_fieldnames';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import {
  ESSearchResponse,
  ESSearchRequest
} from '../../../typings/elasticsearch';

// `type` was deprecated in 7.0
export type APMIndexDocumentParams<T> = Omit<IndexDocumentParams<T>, 'type'>;

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
  const uiSettings = req.getUiSettingsService();
  const { server } = req;
  const [indices, includeFrozen] = await Promise.all([
    getApmIndices({
      config: server.config(),
      savedObjectsClient: server.savedObjects.getScopedSavedObjectsClient(req)
    }),
    uiSettings.get('search:includeFrozen')
  ]);

  // Get indices for legacy data filter (only those which apply)
  const apmIndices: string[] = Object.values(
    pick(indices, [
      'apm_oss.sourcemapIndices',
      'apm_oss.errorIndices',
      'apm_oss.onboardingIndices',
      'apm_oss.spanIndices',
      'apm_oss.transactionIndices',
      'apm_oss.metricsIndices'
    ])
  );
  return {
    ...addFilterForLegacyData(apmIndices, params, apmOptions), // filter out pre-7.0 data
    ignore_throttled: !includeFrozen // whether to query frozen indices or not
  };
}

interface APMOptions {
  includeLegacyData: boolean;
}

interface ClientCreateOptions {
  clientAsInternalUser?: boolean;
}

export type ESClient = ReturnType<typeof getESClient>;

export function getESClient(
  req: Legacy.Request,
  { clientAsInternalUser = false }: ClientCreateOptions = {}
) {
  const cluster = req.server.plugins.elasticsearch.getCluster('data');
  const query = req.query as Record<string, unknown>;

  const callMethod = clientAsInternalUser
    ? cluster.callWithInternalUser.bind(cluster)
    : cluster.callWithRequest.bind(cluster, req);

  return {
    search: async <
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = {}
    >(
      params: TSearchRequest,
      apmOptions?: APMOptions
    ): Promise<ESSearchResponse<TDocument, TSearchRequest>> => {
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

      return (callMethod('search', nextParams) as unknown) as Promise<
        ESSearchResponse<TDocument, TSearchRequest>
      >;
    },
    index: <Body>(params: APMIndexDocumentParams<Body>) => {
      return callMethod('index', params);
    },
    delete: (params: IndicesDeleteParams) => {
      return callMethod('delete', params);
    },
    indicesCreate: (params: IndicesCreateParams) => {
      return callMethod('indices.create', params);
    }
  };
}
