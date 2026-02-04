/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { FC } from 'react';

export const FieldType = {
  INPUT_TEXT: 'INPUT_TEXT',
  SELECT_BASIC: 'SELECT_BASIC',
} as const;

export type FieldType = (typeof FieldType)[keyof typeof FieldType];

export const InputTextFieldSchema = z.object({
  control: z.literal(FieldType.INPUT_TEXT),
});

export const SelectBasicFieldSchema = z.object({
  control: z.literal(FieldType.SELECT_BASIC),
  metadata: z.object({
    options: z.array(z.string()),
  }),
});

/**
 * This can be used to parse `fields` section in the YAML `definition` of the template.
 */
export const FieldSchema = z.discriminatedUnion('control', [
  InputTextFieldSchema,
  SelectBasicFieldSchema,
]);

const InputText = (props: z.infer<typeof InputTextFieldSchema>) => {
  return null;
};
InputText.displayName = 'InputText';

const SelectBasic = (props: z.infer<typeof SelectBasicFieldSchema>) => {
  return null;
};
SelectBasic.displayName = 'SelectBasic ';

export type FieldMap = {
  [K in FieldType]: FC<typeof FieldSchema & { control: K }>;
};

export const fieldRegistry: FieldMap = {
  [FieldType.INPUT_TEXT]: InputText,
  [FieldType.SELECT_BASIC]: SelectBasic,
};
