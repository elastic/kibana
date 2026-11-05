/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { tailSamplingPoliciesSchema } from './types';
import type { ValidateManagedTailSamplingResponse } from './types';

export const validateManagedTailSamplingRoute =
  defineRoute<ValidateManagedTailSamplingResponse>()({
    endpoint: 'POST /internal/managed_tail_sampling/_validate',
    params: lazySchema(() =>
      z.object({
        body: z.object({ policies: tailSamplingPoliciesSchema }),
      })
    ),
  });
