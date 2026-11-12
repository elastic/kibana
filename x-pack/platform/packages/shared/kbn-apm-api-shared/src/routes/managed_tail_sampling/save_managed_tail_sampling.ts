/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import {
  MAX_TAIL_SAMPLING_VERSION_LENGTH,
  TAIL_SAMPLING_HASH_LENGTH,
  tailSamplingPoliciesSchema,
} from './types';
import type { ManagedTailSamplingResponse } from './types';

/**
 * Replaces the whole policy set and enables sampling.
 *
 * `validatedHash` is the hash returned by `_validate` for these exact policies: the save
 * fails with 409 when the policies changed after they were validated.
 *
 * `version` is the stored document's version from the last read. When it is set and the
 * document has changed since, the save fails with 409 instead of overwriting a newer save.
 * Leave it out on the first save.
 */
export const saveManagedTailSamplingRoute = defineRoute<ManagedTailSamplingResponse>()({
  endpoint: 'PUT /internal/managed_tail_sampling',
  params: lazySchema(() =>
    z.object({
      body: z.object({
        policies: tailSamplingPoliciesSchema,
        validatedHash: z.string().length(TAIL_SAMPLING_HASH_LENGTH),
        version: z.string().max(MAX_TAIL_SAMPLING_VERSION_LENGTH).optional(),
      }),
    })
  ),
});
