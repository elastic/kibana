/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export enum CustomFieldTypes {
  TEXT = 'text',
  TOGGLE = 'toggle',
  NUMBER = 'number',
}

export const CustomFieldTextTypeSchema = lazySchema(() => z.literal(CustomFieldTypes.TEXT));
export const CustomFieldToggleTypeSchema = lazySchema(() => z.literal(CustomFieldTypes.TOGGLE));
export const CustomFieldNumberTypeSchema = lazySchema(() => z.literal(CustomFieldTypes.NUMBER));

const CaseCustomFieldTextSchema = lazySchema(() => z.object({
  key: z.string(),
  type: CustomFieldTextTypeSchema,
  value: z.string().nullable(),
}));

export const CaseCustomFieldToggleSchema = lazySchema(() => z.object({
  key: z.string(),
  type: CustomFieldToggleTypeSchema,
  value: z.boolean().nullable(),
}));

export const CaseCustomFieldNumberSchema = lazySchema(() => z.object({
  key: z.string(),
  type: CustomFieldNumberTypeSchema,
  value: z.number().nullable(),
}));

export const CaseCustomFieldSchema = lazySchema(() => z.union([
  CaseCustomFieldTextSchema,
  CaseCustomFieldToggleSchema,
  CaseCustomFieldNumberSchema,
]));

export const CaseCustomFieldsSchema = lazySchema(() => z.array(CaseCustomFieldSchema));

export type CaseCustomFields = z.infer<typeof CaseCustomFieldsSchema>;
export type CaseCustomField = z.infer<typeof CaseCustomFieldSchema>;
export type CaseCustomFieldToggle = z.infer<typeof CaseCustomFieldToggleSchema>;
export type CaseCustomFieldText = z.infer<typeof CaseCustomFieldTextSchema>;
export type CaseCustomFieldNumber = z.infer<typeof CaseCustomFieldNumberSchema>;
