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
import { merge } from 'lodash';
import { cloneDeep, isString } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { OBSERVER_VERSION_MAJOR } from '../../../common/elasticsearch_fieldnames';
import {
  ESSearchResponse,
  ESSearchRequest
} from '../../../typings/elasticsearch';
import { APMRequestHandlerContext } from '../../routes/typings';
import { pickKeys } from '../../../public/utils/pickKeys';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';

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
  context: APMRequestHandlerContext,
  params: ESSearchRequest,
  apmOptions?: APMOptions
) {
  const { uiSettings } = context.core;
  const [indices, includeFrozen] = await Promise.all([
    getApmIndices({
      savedObjectsClient: context.core.savedObjects.client,
      config: context.config
    }),
    uiSettings.client.get('search:includeFrozen')
  ]);

  // Get indices for legacy data filter (only those which apply)
  const apmIndices = Object.values(
    pickKeys(
      indices,
      'apm_oss.sourcemapIndices',
      'apm_oss.errorIndices',
      'apm_oss.onboardingIndices',
      'apm_oss.spanIndices',
      'apm_oss.transactionIndices',
      'apm_oss.metricsIndices'
    )
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
  context: APMRequestHandlerContext,
  request: KibanaRequest,
  { clientAsInternalUser = false }: ClientCreateOptions = {}
) {
  const {
    callAsCurrentUser,
    callAsInternalUser
  } = context.core.elasticsearch.dataClient;

  const callMethod = clientAsInternalUser
    ? callAsInternalUser
    : callAsCurrentUser;

  return {
    search: async <
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = {}
    >(
      params: TSearchRequest,
      apmOptions?: APMOptions
    ): Promise<ESSearchResponse<TDocument, TSearchRequest>> => {
      const nextParams = await getParamsForSearchRequest(
        context,
        params,
        apmOptions
      );

      if (context.params.query._debug) {
        console.log(`--DEBUG ES QUERY--`);
        console.log(
          `${request.url.pathname} ${JSON.stringify(context.params.query)}`
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
