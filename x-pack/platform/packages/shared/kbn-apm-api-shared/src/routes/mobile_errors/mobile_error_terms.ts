/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export type MobileErrorTermsByFieldResponse = Array<{
  label: string;
  count: number;
}>;

export interface MobileErrorTermsRouteResponse {
  terms: MobileErrorTermsByFieldResponse;
}

export const mobileErrorTermsRoute = defineRoute<MobileErrorTermsRouteResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/error_terms',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      t.type({
        size: toNumberRt,
        fieldName: t.string,
      }),
    ]),
  }),
});
