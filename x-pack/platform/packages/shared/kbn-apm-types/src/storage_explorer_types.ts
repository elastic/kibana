/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';
import { IndexLifecyclePhaseSelectOption } from './ilm_types';

export const indexLifecyclePhaseRt = t.type({
  indexLifecyclePhase: t.union([
    t.literal(IndexLifecyclePhaseSelectOption.All),
    t.literal(IndexLifecyclePhaseSelectOption.Hot),
    t.literal(IndexLifecyclePhaseSelectOption.Warm),
    t.literal(IndexLifecyclePhaseSelectOption.Cold),
    t.literal(IndexLifecyclePhaseSelectOption.Frozen),
  ]),
});

/**
 * zod equivalent, additive (see `default_api_types.ts` in `@kbn/apm-api-shared`
 * for why - elastic/kibana#243355).
 */
export const indexLifecyclePhaseSchema = z.object({
  indexLifecyclePhase: z.union([
    z.literal(IndexLifecyclePhaseSelectOption.All),
    z.literal(IndexLifecyclePhaseSelectOption.Hot),
    z.literal(IndexLifecyclePhaseSelectOption.Warm),
    z.literal(IndexLifecyclePhaseSelectOption.Cold),
    z.literal(IndexLifecyclePhaseSelectOption.Frozen),
  ]),
});
