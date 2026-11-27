/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_NODE_ID_LENGTH,
  MAX_STATE_KEY_LENGTH,
  MAX_STATE_STRING_LENGTH,
  RESERVED_STATE_KEYS,
} from './constants';

/** What every node has, whatever its capability: an id, and when it is shown. */
export const nodeIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_NODE_ID_LENGTH)
    .regex(/^[A-Za-z0-9_-]+$/)
);

/** A valid ES|QL parameter name, so a state key can be used as `?key` in a query. */
export const stateKeySchema = lazySchema(() =>
  z
    .string()
    .max(MAX_STATE_KEY_LENGTH)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .refine((key) => !RESERVED_STATE_KEYS.includes(key.toLowerCase()), {
      message: `Reserved by ES|QL for the time range: ${RESERVED_STATE_KEYS.join(', ')}`,
    })
);

/**
 * Whether a component is shown: when the key is true, or, with `equals`, when it is that value, such
 * as the option of a select. Left out, it is always shown.
 */
export const visibleWhenSchema = lazySchema(() =>
  z
    .object({
      $state: stateKeySchema,
      equals: z
        .union([z.string().max(MAX_STATE_STRING_LENGTH), z.number().finite(), z.boolean()])
        .optional(),
    })
    .optional()
);

export type VisibleWhen = NonNullable<z.output<typeof visibleWhenSchema>>;
