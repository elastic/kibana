/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const transactionMaxSpansRt = new t.Type<number, number, unknown>(
  'transactionMaxSpans',
  t.number.is,
  (input, context) => {
    const value = parseInt(input as string, 10);
    return value >= 0 && value <= 32000
      ? t.success(value)
      : t.failure(input, context);
  },
  t.identity
);
