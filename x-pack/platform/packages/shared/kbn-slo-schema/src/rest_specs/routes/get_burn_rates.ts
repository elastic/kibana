/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';

import { durationType } from '../../schema/duration';
import { allOrAnyString } from '../../schema/common';

const getSLOBurnRatesResponseSchema = lazySchema(() => z.object({
  burnRates: z.array(
    z.object({
      name: z.string(),
      burnRate: z.number(),
      sli: z.number(),
    })
  ),
}));

const getSLOBurnRatesParamsSchema = lazySchema(() => z.object({
  path: z.object({ id: z.string() }),
  body: z.object({
    instanceId: allOrAnyString,
    windows: z.array(
      z.object({
        name: z.string(),
        duration: durationType,
      })
    ),
    remoteName: z.string().optional(),
  }),
}));

type GetSLOBurnRatesResponse = z.input<typeof getSLOBurnRatesResponseSchema>;

export { getSLOBurnRatesParamsSchema, getSLOBurnRatesResponseSchema };
export type { GetSLOBurnRatesResponse };
