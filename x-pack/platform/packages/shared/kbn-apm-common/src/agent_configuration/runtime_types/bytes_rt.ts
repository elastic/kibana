/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { amountAndUnitToObject } from '../amount_and_unit';
import { getRangeTypeMessage } from './get_range_type_message';

function toBytes(amount: number, unit: string) {
  switch (unit) {
    case 'b':
      return amount;
    case 'kb':
      return amount * 2 ** 10;
    case 'mb':
      return amount * 2 ** 20;
  }
}

function amountAndUnitToBytes(value?: string): number | undefined {
  if (value) {
    const { amount, unit } = amountAndUnitToObject(value);
    if (isFinite(amount) && unit) {
      return toBytes(amount, unit);
    }
  }
}

export function getBytesSchema({ min, max }: { min?: string; max?: string }) {
  const minAsBytes = amountAndUnitToBytes(min) ?? -Infinity;
  const maxAsBytes = amountAndUnitToBytes(max) ?? Infinity;
  const message = getRangeTypeMessage(min, max);

  return z.string().refine(
    (inputAsString) => {
      const inputAsBytes = amountAndUnitToBytes(inputAsString);
      return inputAsBytes !== undefined && inputAsBytes >= minAsBytes && inputAsBytes <= maxAsBytes;
    },
    { message }
  );
}
