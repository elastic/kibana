/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import {
  MAX_TAIL_SAMPLING_HASH_LENGTH,
  MAX_TAIL_SAMPLING_VERSION_LENGTH,
  tailSamplingSettingsSchema,
} from './types';
import type { TailSamplingResponse } from './types';

/**
 * Replaces the whole config and enables sampling.
 *
 * `validatedHash` is the hash returned by `_validate` for this exact config: the save
 * fails with 409 when the config changed after it was validated.
 *
 * `version` is the stored document's version from the last read. When it is set and the
 * document has changed since, the save fails with 409 instead of overwriting a newer save.
 * Leave it out on the first save.
 */
export const saveTailSamplingRoute = defineRoute<TailSamplingResponse>()({
  endpoint: 'PUT /internal/tail_sampling',
  params: lazySchema(() =>
    z.object({
      body: tailSamplingSettingsSchema.extend({
        validatedHash: z.string().min(1).max(MAX_TAIL_SAMPLING_HASH_LENGTH),
        version: z.string().max(MAX_TAIL_SAMPLING_VERSION_LENGTH).optional(),
      }),
    })
  ),
});
