/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { Duration } from '../../models/duration';
import { MAX_DURATION_STRING_LENGTH } from './limits';

/**
 * Codec between a wire-form duration string (`30d`) and the {@link Duration} model.
 * `Duration.fromString` is the single source of truth for the parsing semantics
 * (including the historical `parseInt` leniency) and for rejecting non-positive
 * values and unknown units.
 */
const durationType = z.codec(
  z
    .string()
    .max(MAX_DURATION_STRING_LENGTH)
    .describe(
      'The duration formatted as {duration}{unit}, for example 30d. Accepted units are m, h, d, w and M'
    ),
  z.instanceof(Duration),
  {
    decode: (value, payload) => {
      try {
        return Duration.fromString(value);
      } catch (err) {
        payload.issues.push({
          code: 'custom',
          message: `Invalid duration: ${value}, must be {duration}{unit}, for example 30d`,
          input: value,
        });
        return z.NEVER;
      }
    },
    encode: (duration) => duration.format(),
  }
);

export { durationType };
