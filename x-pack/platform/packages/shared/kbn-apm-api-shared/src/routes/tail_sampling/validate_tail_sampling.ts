/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { tailSamplingSettingsSchema } from './types';
import type { ValidateTailSamplingResponse } from './types';

/** Validates a processor and its config. Writes nothing. */
export const validateTailSamplingRoute = defineRoute<ValidateTailSamplingResponse>()({
  endpoint: 'POST /internal/tail_sampling/_validate',
  params: lazySchema(() =>
    z.object({
      body: tailSamplingSettingsSchema,
    })
  ),
});
