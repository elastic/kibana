/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CustomFieldTypes } from '../../domain/custom_field/v1';

export { CustomFieldTypes };

export const CustomFieldTextTypeSchema = z.literal(CustomFieldTypes.TEXT);
export const CustomFieldToggleTypeSchema = z.literal(CustomFieldTypes.TOGGLE);
export const CustomFieldNumberTypeSchema = z.literal(CustomFieldTypes.NUMBER);

const CaseCustomFieldTextSchema = z.object({
  key: z.string(),
  type: CustomFieldTextTypeSchema,
  value: z.string().nullable(),
});

export const CaseCustomFieldToggleSchema = z.object({
  key: z.string(),
  type: CustomFieldToggleTypeSchema,
  value: z.boolean().nullable(),
});

export const CaseCustomFieldNumberSchema = z.object({
  key: z.string(),
  type: CustomFieldNumberTypeSchema,
  value: z.number().nullable(),
});

export const CaseCustomFieldSchema = z.union([
  CaseCustomFieldTextSchema,
  CaseCustomFieldToggleSchema,
  CaseCustomFieldNumberSchema,
]);

export const CaseCustomFieldsSchema = z.array(CaseCustomFieldSchema);

export type CaseCustomFields = z.infer<typeof CaseCustomFieldsSchema>;
export type CaseCustomField = z.infer<typeof CaseCustomFieldSchema>;
export type CaseCustomFieldToggle = z.infer<typeof CaseCustomFieldToggleSchema>;
export type CaseCustomFieldText = z.infer<typeof CaseCustomFieldTextSchema>;
export type CaseCustomFieldNumber = z.infer<typeof CaseCustomFieldNumberSchema>;
