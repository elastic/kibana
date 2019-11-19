/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Server } from 'hapi';
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

function decodeUiFilters(server: Server, uiFiltersEncoded?: string) {
  if (!uiFiltersEncoded) {
    return [];
  }
  const uiFilters = JSON.parse(uiFiltersEncoded);
  return getUiFiltersES(server, uiFilters);
}

export interface APMRequestQuery {
  _debug?: string;
  start?: string;
  end?: string;
  uiFilters?: string;
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
}

export async function setupRequest(req: Legacy.Request): Promise<Setup> {
  const query = (req.query as unknown) as APMRequestQuery;
  const { server } = req;
  const savedObjectsClient = server.savedObjects.getScopedSavedObjectsClient(
    req
  );
  const config = server.config();
  const [uiFiltersES, indices] = await Promise.all([
    decodeUiFilters(server, query.uiFilters),
    getApmIndices({ config, savedObjectsClient })
  ]);

  return {
    start: moment.utc(query.start).valueOf(),
    end: moment.utc(query.end).valueOf(),
    uiFiltersES,
    client: getESClient(req, { clientAsInternalUser: false }),
    internalClient: getESClient(req, { clientAsInternalUser: true }),
    config,
    indices
  };
}
