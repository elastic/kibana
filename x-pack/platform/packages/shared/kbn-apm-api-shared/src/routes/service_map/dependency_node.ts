/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { NodeStats } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, offsetRt } from '../../default_api_types';

export interface ServiceMapServiceDependencyInfoResponse {
  currentPeriod: NodeStats;
  previousPeriod: NodeStats | undefined;
}

export const serviceMapDependencyNodeRoute = defineRoute<ServiceMapServiceDependencyInfoResponse>()(
  {
    endpoint: 'GET /internal/apm/service-map/dependency',
    params: t.type({
      query: t.intersection([
        t.type({
          dependencies: t.union([t.string, t.array(t.string)]),
        }),
        t.partial({ sourceServiceName: t.string }),
        environmentRt,
        rangeRt,
        offsetRt,
      ]),
    }),
  }
);
