/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { ServiceMapResponse } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { jsonRt } from '@kbn/io-ts-utils';
import { defineRoute } from '../types';
import { rangeRt, kueryRt } from '../../default_api_types';

export type ServiceMapRouteResponse = ServiceMapResponse;

export const serviceMapRoute = defineRoute<ServiceMapRouteResponse>()({
  endpoint: 'GET /internal/apm/service-map',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        serviceGroup: t.string,
        kuery: kueryRt.props.kuery,
        // JSON-serialised ES query produced by buildEsQuery() on the client.
        // Carries filter-bar pills + Controls API selections already merged.
        esQuery: jsonRt,
      }),
      environmentRt,
      rangeRt,
    ]),
  }),
});
