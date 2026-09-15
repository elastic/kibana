/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { IndexLifecyclePhaseSelectOption } from './ilm_types';

export const indexLifecyclePhaseSchema = z.object({
  indexLifecyclePhase: z.union([
    z.literal(IndexLifecyclePhaseSelectOption.All),
    z.literal(IndexLifecyclePhaseSelectOption.Hot),
    z.literal(IndexLifecyclePhaseSelectOption.Warm),
    z.literal(IndexLifecyclePhaseSelectOption.Cold),
    z.literal(IndexLifecyclePhaseSelectOption.Frozen),
  ]),
});
