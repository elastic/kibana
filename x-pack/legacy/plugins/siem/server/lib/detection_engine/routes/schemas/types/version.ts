/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

export type VersionC = t.Type<number, number, unknown>;

/**
 * Types the version as:
 *   - Natural Number (positive integer and not a float)
 *   - Greater than or equal to 1
 */
export const Version: VersionC = new t.Type<number, number, unknown>(
  'Version',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    return typeof input === 'number' && Number.isSafeInteger(input) && input >= 1
      ? t.success(input)
      : t.failure(input, context);
  },
  t.identity
);
