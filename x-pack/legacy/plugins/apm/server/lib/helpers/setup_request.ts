/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import moment from 'moment';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { getESClient } from './es_client';
import { getUiFiltersES } from './convert_ui_filters/get_ui_filters_es';
import {
  getApmIndices,
  ApmIndicesConfig
} from '../settings/apm_indices/get_apm_indices';
import { ESFilter } from '../../../typings/elasticsearch';
import { ESClient } from './es_client';
import { StaticIndexPattern } from '../../../../../../../src/legacy/core_plugins/data/public';
import { getDynamicIndexPattern } from '../index_pattern/get_dynamic_index_pattern';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { ProcessorEvent } from '../../../common/processor_event';

function decodeUiFilters(
  indexPattern: StaticIndexPattern | undefined,
  uiFiltersEncoded?: string
) {
  if (!uiFiltersEncoded || !indexPattern) {
    return [];
  }
  const uiFilters = JSON.parse(uiFiltersEncoded);
  return getUiFiltersES(indexPattern, uiFilters);
}

export interface APMRequestQuery {
  _debug?: string;
  start?: string;
  end?: string;
  uiFilters?: string;
  processorEvent?: ProcessorEvent;
}
// Explicitly type Setup to prevent TS initialization errors
// https://github.com/microsoft/TypeScript/issues/34933

export interface Setup {
  start: number;
  end: number;
  uiFiltersES: ESFilter[];
  client: ESClient;
  internalClient: ESClient;
  config: KibanaConfig;
  indices: ApmIndicesConfig;
  dynamicIndexPattern?: IIndexPattern;
}

export async function setupRequest(req: Legacy.Request): Promise<Setup> {
  const query = (req.query as unknown) as APMRequestQuery;
  const { server } = req;
  const savedObjectsClient = server.savedObjects.getScopedSavedObjectsClient(
    req
  );
  const config = server.config();
  const indices = await getApmIndices({ config, savedObjectsClient });

  const dynamicIndexPattern = await getDynamicIndexPattern({
    request: req,
    indices,
    processorEvent: query.processorEvent
  });
  const uiFiltersES = decodeUiFilters(dynamicIndexPattern, query.uiFilters);

  return {
    start: moment.utc(query.start).valueOf(),
    end: moment.utc(query.end).valueOf(),
    uiFiltersES,
    client: getESClient(req, { clientAsInternalUser: false }),
    internalClient: getESClient(req, { clientAsInternalUser: true }),
    config,
    indices,
    dynamicIndexPattern
  };
}
