/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

export const createRangeType = (from: number, to: number, decimals?: number) =>
  new t.Type<number, number, unknown>(
    'Range',
    (u): u is number => typeof u === 'number',
    (u, c) => {
      return either.chain(t.number.validate(u, c), a => {
        const val = decimals === undefined ? a : Number(a.toFixed(decimals));
        return val >= from && val <= to ? t.success(val) : t.failure(a, c);
      });
    },
    Number
  );
