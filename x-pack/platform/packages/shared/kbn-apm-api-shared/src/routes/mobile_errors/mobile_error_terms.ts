/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';
import { MAX_FIELD_VALUE_LENGTH } from '../../constants';

export type MobileErrorTermsByFieldResponse = Array<{
  label: string;
  count: number;
}>;

export interface MobileErrorTermsRouteResponse {
  terms: MobileErrorTermsByFieldResponse;
}

export const mobileErrorTermsRoute = defineRoute<MobileErrorTermsRouteResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/error_terms',
  params: lazySchema(() =>
    z.object({
      path: z.object({
        serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH),
      }),
      query: kuerySchema
        .merge(rangeSchema)
        .merge(environmentSchema)
        .merge(
          z.object({
            size: z.coerce.number().int().min(1).max(1000),
            fieldName: z.string().max(MAX_FIELD_VALUE_LENGTH),
          })
        ),
    })
  ),
});
