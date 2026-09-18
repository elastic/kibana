/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { getRangeTypeMessage } from './get_range_type_message';

export function getIntegerSchema({
  min = -Infinity,
  max = Infinity,
}: {
  min?: number;
  max?: number;
} = {}) {
  const message = getRangeTypeMessage(min, max);

  return z.string().refine(
    (inputAsString) => {
      const inputAsInt = parseInt(inputAsString, 10);
      return inputAsInt >= min && inputAsInt <= max;
    },
    { message }
  );
}
