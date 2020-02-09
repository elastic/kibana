/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const transactionSampleRateRt = new t.Type<number, number, unknown>(
  'TransactionSampleRate',
  t.number.is,
  (input, context) => {
    const value = parseFloat(input as string);
    return value >= 0 && value <= 1 && parseFloat(value.toFixed(3)) === value
      ? t.success(value)
      : t.failure(input, context);
  },
  t.identity
);
