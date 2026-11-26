/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HUMAN_READABLE_ID_MAX_LENGTH,
  HUMAN_READABLE_ID_MIN_LENGTH,
  HUMAN_READABLE_ID_PATTERN,
} from '@kbn/human-readable-id';
import { lazySchema, z } from '@kbn/zod';

/**
 * Canonical Zod schema for persisted workflow IDs. Enforces the same
 * min/max length and pattern as the human-readable-id package, so callers
 * across the codebase (import, generation, action policies) validate against
 * a single source of truth.
 */
export const workflowIdSchema = lazySchema(() =>
  z
    .string()
    .min(HUMAN_READABLE_ID_MIN_LENGTH)
    .max(HUMAN_READABLE_ID_MAX_LENGTH)
    .regex(HUMAN_READABLE_ID_PATTERN)
);
