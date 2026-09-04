/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { MAX_KEYWORD_LENGTH } from '../../schema/zod/limits';
import { durationType } from '../../schema/zod/duration';
import { allOrAnyString } from '../../schema/zod/common';

const getSLOBurnRatesResponseSchema = z.object({
  burnRates: z.array(
    z.object({
      name: z.string(),
      burnRate: z.number(),
      sli: z.number(),
    })
  ),
});

const getSLOBurnRatesParamsSchema = z.object({
  path: z.object({ id: z.string().max(MAX_KEYWORD_LENGTH) }),
  body: z.object({
    instanceId: allOrAnyString,
    windows: z.array(
      z.object({
        name: z.string().max(MAX_KEYWORD_LENGTH),
        duration: durationType,
      })
    ),
    remoteName: z.string().optional(),
  }),
});

type GetSLOBurnRatesResponse = z.input<typeof getSLOBurnRatesResponseSchema>;

export { getSLOBurnRatesParamsSchema, getSLOBurnRatesResponseSchema };
export type { GetSLOBurnRatesResponse };
