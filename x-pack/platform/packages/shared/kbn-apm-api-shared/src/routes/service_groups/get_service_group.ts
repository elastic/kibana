/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { SavedServiceGroup } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface ServiceGroupResponse {
  serviceGroup: SavedServiceGroup;
}

export const serviceGroupRoute = defineRoute<ServiceGroupResponse>()({
  endpoint: 'GET /internal/apm/service-group',
  params: t.type({
    query: t.type({ serviceGroup: t.string }),
  }),
});
