/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { either } from 'fp-ts/lib/Either';

export const NumberFromString = new rt.Type<number, string, unknown>(
  'NumberFromString',
  rt.number.is,
  (u, c) =>
    either.chain(rt.string.validate(u, c), (s) => {
      const n = +s;
      return isNaN(n) ? rt.failure(u, c, 'cannot parse to a number') : rt.success(n);
    }),
  String
);
