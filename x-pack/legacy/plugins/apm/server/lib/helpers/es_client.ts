/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SearchParams,
  IndexDocumentParams,
  IndicesDeleteParams,
  IndicesCreateParams,
  BulkIndexDocumentsParams
} from 'elasticsearch';
import { merge } from 'lodash';
import { cloneDeep, isString } from 'lodash';
import { IUiSettingsClient, IScopedClusterClient } from 'src/core/server';
import { OBSERVER_VERSION_MAJOR } from '../../../common/elasticsearch_fieldnames';
import {
  ESSearchResponse,
  ESSearchRequest
} from '../../../typings/elasticsearch';
import { pickKeys } from '../../../public/utils/pickKeys';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

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
  params: ESSearchRequest,
  { includeLegacyData = false } = {}
): SearchParams {
  // search across all data (including data)
  if (includeLegacyData || !isApmIndex(apmIndices, params.index)) {
    return params;
  }

  const nextParams = merge(
    {
      body: {
        query: {
          bool: {
            filter: []
          }
        }
      }
    },
    cloneDeep(params)
  );

  // add filter for omitting pre-7.x data
  nextParams.body.query.bool.filter.push({
    range: { [OBSERVER_VERSION_MAJOR]: { gte: 7 } }
  });

  return nextParams;
}

// add additional params for search (aka: read) requests
async function getParamsForSearchRequest(
  apmIndices: ApmIndicesConfig,
  uiSettingsClient: IUiSettingsClient,
  params: ESSearchRequest,
  apmOptions?: APMOptions
) {
  const includeFrozen = await uiSettingsClient.get('search:includeFrozen');

  // Get indices for legacy data filter (only those which apply)
  const legacyApmIndices = Object.values(
    pickKeys(
      apmIndices,
      'apm_oss.sourcemapIndices',
      'apm_oss.errorIndices',
      'apm_oss.onboardingIndices',
      'apm_oss.spanIndices',
      'apm_oss.transactionIndices',
      'apm_oss.metricsIndices'
    )
  );
  return {
    ...addFilterForLegacyData(legacyApmIndices, params, apmOptions), // filter out pre-7.0 data
    ignore_throttled: !includeFrozen // whether to query frozen indices or not
  };
}

interface APMOptions {
  includeLegacyData: boolean;
}

export type ESClient = ReturnType<typeof getESClient>;

export function getESClient(
  apmIndices: ApmIndicesConfig,
  uiSettingsClient: IUiSettingsClient,
  esClient:
    | IScopedClusterClient['callAsCurrentUser']
    | IScopedClusterClient['callAsInternalUser'],
  onRequest: (endpoint: string, params: Record<any, any>) => void = () => {}
) {
  return {
    search: async <
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = {}
    >(
      params: TSearchRequest,
      apmOptions?: APMOptions
    ): Promise<ESSearchResponse<TDocument, TSearchRequest>> => {
      const nextParams = await getParamsForSearchRequest(
        apmIndices,
        uiSettingsClient,
        params,
        apmOptions
      );

      onRequest('search', nextParams);

      return (esClient('search', nextParams) as unknown) as Promise<
        ESSearchResponse<TDocument, TSearchRequest>
      >;
    },
    index: <Body>(params: APMIndexDocumentParams<Body>) => {
      onRequest('index', params);
      return esClient('index', params);
    },
    delete: (params: IndicesDeleteParams) => {
      onRequest('delete', params);
      return esClient('delete', params);
    },
    indicesCreate: (params: IndicesCreateParams) => {
      onRequest('indices.create', params);
      return esClient('indices.create', params);
    },
    bulk: (params: BulkIndexDocumentsParams) => {
      onRequest('bulk', params);
      return esClient('bulk', params);
    }
  };
}
