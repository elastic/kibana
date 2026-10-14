/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { unitOfTime } from 'moment';
import moment from 'moment';
import type { AmountAndUnit } from '../amount_and_unit';
import { amountAndUnitToObject } from '../amount_and_unit';
import { getRangeTypeMessage } from './get_range_type_message';

function toMilliseconds({ amount, unit }: AmountAndUnit) {
  return moment.duration(amount, unit as unitOfTime.Base);
}

function amountAndUnitToMilliseconds(value?: string) {
  if (value) {
    const { amount, unit } = amountAndUnitToObject(value);
    if (isFinite(amount) && unit) {
      return toMilliseconds({ amount, unit });
    }
  }
}

export function getDurationSchema({ min, max }: { min?: string; max?: string }) {
  const minAsMilliseconds = amountAndUnitToMilliseconds(min) ?? -Infinity;
  const maxAsMilliseconds = amountAndUnitToMilliseconds(max) ?? Infinity;
  const message = getRangeTypeMessage(min, max);

  return z.string().refine(
    (inputAsString) => {
      const inputAsMilliseconds = amountAndUnitToMilliseconds(inputAsString);
      return (
        inputAsMilliseconds !== undefined &&
        inputAsMilliseconds >= minAsMilliseconds &&
        inputAsMilliseconds <= maxAsMilliseconds
      );
    },
    { message }
  );
}
