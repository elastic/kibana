/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { z } from '@kbn/zod';

import { FieldType } from './constants';
import type { FieldSchema } from './schema';

import { InputText } from './controls/input_text';
import { SelectBasic } from './controls/select_basic';
import { Textarea } from './controls/textarea';
import { InputNumber } from './controls/input_number';

// NOTE: this guarantees the control will receive props aligned with the schema
export type FieldMap = {
  [K in FieldType]: FC<Extract<z.infer<typeof FieldSchema>, { control: K }>>;
};

// NOTE: Register ui controls here (remember to update ./schema as well)
export const controlRegistry: FieldMap = {
  [FieldType.INPUT_TEXT]: InputText,
  [FieldType.INPUT_NUMBER]: InputNumber,
  [FieldType.SELECT_BASIC]: SelectBasic,
  [FieldType.TEXTAREA]: Textarea,
};
