/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const floatFourDecimalPlacesSchema = z.string().refine(
  (inputAsString) => {
    const inputAsFloat = parseFloat(inputAsString);
    const maxFourDecimals = parseFloat(inputAsFloat.toFixed(4)) === inputAsFloat;
    return inputAsFloat >= 0 && inputAsFloat <= 1 && maxFourDecimals;
  },
  { message: 'Must be a number between 0.0000 and 1' }
);
