/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
import moment from 'moment';
import { KibanaRequest } from 'src/core/server';
import { IIndexPattern } from 'src/plugins/data/common';
import { APMConfig } from '../../../../../../plugins/apm/server';
import {
  getApmIndices,
  ApmIndicesConfig
} from '../settings/apm_indices/get_apm_indices';
import { ESFilter } from '../../../typings/elasticsearch';
import { ESClient } from './es_client';
import { getUiFiltersES } from './convert_ui_filters/get_ui_filters_es';
import { APMRequestHandlerContext } from '../../routes/typings';
import { getESClient } from './es_client';
import { ProcessorEvent } from '../../../common/processor_event';
import { getDynamicIndexPattern } from '../index_pattern/get_dynamic_index_pattern';

function decodeUiFilters(
  indexPattern: IIndexPattern | undefined,
  uiFiltersEncoded?: string
) {
  if (!uiFiltersEncoded || !indexPattern) {
    return [];
  }
  const uiFilters = JSON.parse(uiFiltersEncoded);
  return getUiFiltersES(indexPattern, uiFilters);
}
// Explicitly type Setup to prevent TS initialization errors
// https://github.com/microsoft/TypeScript/issues/34933

export interface Setup {
  client: ESClient;
  internalClient: ESClient;
  config: APMConfig;
  indices: ApmIndicesConfig;
  dynamicIndexPattern?: IIndexPattern;
}

export interface SetupTimeRange {
  start: number;
  end: number;
}
export interface SetupUIFilters {
  uiFiltersES: ESFilter[];
}

interface SetupRequestParams {
  query?: {
    _debug?: boolean;
    start?: string;
    end?: string;
    uiFilters?: string;
    processorEvent?: ProcessorEvent;
  };
}

type InferSetup<TParams extends SetupRequestParams> = Setup &
  (TParams extends { query: { start: string } } ? { start: number } : {}) &
  (TParams extends { query: { end: string } } ? { end: number } : {}) &
  (TParams extends { query: { uiFilters: string } }
    ? { uiFiltersES: ESFilter[] }
    : {});

export async function setupRequest<TParams extends SetupRequestParams>(
  context: APMRequestHandlerContext<TParams>,
  request: KibanaRequest
): Promise<InferSetup<TParams>> {
  const { config } = context;
  const { query } = context.params;

  const indices = await getApmIndices({
    savedObjectsClient: context.core.savedObjects.client,
    config
  });

  const dynamicIndexPattern = await getDynamicIndexPattern({
    context,
    indices,
    processorEvent: query.processorEvent
  });

  const uiFiltersES = decodeUiFilters(dynamicIndexPattern, query.uiFilters);

  const {
    callAsCurrentUser,
    callAsInternalUser
  } = context.core.elasticsearch.dataClient;

  const onRequest = (endpoint: string, params: Record<any, any>) => {
    if (endpoint === 'search' && query._debug) {
      console.log(`--DEBUG ES QUERY--`);
      console.log(
        `${request.url.pathname} ${JSON.stringify(context.params.query)}`
      );
      console.log(`GET ${params.index}/_search`);
      console.log(JSON.stringify(params.body, null, 2));
    }
  };

  const coreSetupRequest = {
    indices,
    client: getESClient(
      indices,
      context.core.uiSettings.client,
      callAsCurrentUser,
      onRequest
    ),
    internalClient: getESClient(
      indices,
      context.core.uiSettings.client,
      callAsInternalUser,
      onRequest
    ),
    config,
    dynamicIndexPattern
  };

  return {
    ...('start' in query ? { start: moment.utc(query.start).valueOf() } : {}),
    ...('end' in query ? { end: moment.utc(query.end).valueOf() } : {}),
    ...('uiFilters' in query ? { uiFiltersES } : {}),
    ...coreSetupRequest
  } as InferSetup<TParams>;
}
