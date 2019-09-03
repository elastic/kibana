/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Server } from 'hapi';
import moment from 'moment';
import { getESClient } from './es_client';
import { getUiFiltersES } from './convert_ui_filters/get_ui_filters_es';
import { PromiseReturnType } from '../../../typings/common';

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

export type Setup = PromiseReturnType<typeof setupRequest>;
export async function setupRequest(req: Legacy.Request) {
  const query = (req.query as unknown) as APMRequestQuery;
  const { server } = req;
  const config = server.config();

  return {
    start: moment.utc(query.start).valueOf(),
    end: moment.utc(query.end).valueOf(),
    uiFiltersES: await decodeUiFilters(server, query.uiFilters),
    client: getESClient(req),
    config
  };
}
