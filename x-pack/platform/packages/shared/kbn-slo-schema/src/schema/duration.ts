/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { either } from 'fp-ts/Either';
import * as t from 'io-ts';

import { Duration } from '../models/duration';

const durationType = new t.Type<Duration, string, unknown>(
  'Duration',
  (input: unknown): input is Duration => input instanceof Duration,
  (input: unknown, context: t.Context) =>
    either.chain(t.string.validate(input, context), (value: string) => {
      try {
        return t.success(Duration.fromString(value));
      } catch (err) {
        return t.failure(input, context);
      }
    }),
  (duration: Duration): string => duration.format()
);

export { durationType };
