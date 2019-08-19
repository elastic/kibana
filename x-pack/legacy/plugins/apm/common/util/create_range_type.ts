/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export const createRangeType = (
  from: number,
  to: number,
  precision: number | null = null
) =>
  new t.Type<number, number, unknown>(
    'Range',
    (u): u is number => typeof u === 'number',
    (u, c) => {
      return Number(u) >= from && Number(u) <= to
        ? t.success(Number(u))
        : t.failure(u, c);
    },
    a => (precision === null ? a : Number(a.toPrecision(precision)))
  );
