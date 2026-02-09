/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { FieldType } from '../constants';

export const InputNumberFieldSchema = z.object({
  control: z.literal(FieldType.INPUT_NUMBER),
});

export const InputNumber = (props: z.infer<typeof InputNumberFieldSchema>) => {
  return null;
};
InputNumber.displayName = 'InputNumber';
