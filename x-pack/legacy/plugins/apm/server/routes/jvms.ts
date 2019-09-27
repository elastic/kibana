/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';
import { getJvms } from '../lib/jvms';
import { rangeRt, uiFiltersRt } from './default_api_types';

export const jvmsRoute = createRoute(core => ({
  path: '/api/apm/services/{serviceName}/jvms',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      rangeRt,
      uiFiltersRt,
      t.partial({
        sortField: t.string,
        sortDirection: t.string
      })
    ])
  },
  handler: async (req, { path, query }) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;
    const { sortField, sortDirection } = query;

    return getJvms({ setup, serviceName, sortField, sortDirection });
  }
}));
