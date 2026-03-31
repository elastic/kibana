/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const ConditionRuleSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'contains', 'empty', 'not_empty']),
  value: z.union([z.string(), z.number()]).optional(),
});

export const CompoundConditionSchema = z.object({
  combine: z.enum(['all', 'any']).default('all'),
  rules: z.array(ConditionRuleSchema).min(1),
});

export const ConditionSchema = z.union([ConditionRuleSchema, CompoundConditionSchema]);

export const DisplaySchema = z.object({
  show_when: ConditionSchema.optional(),
});

export const ValidationSchema = z.object({
  required: z.boolean().optional(),
  required_when: ConditionSchema.optional(),
  pattern: z
    .object({
      regex: z.string(),
      message: z.string().optional(),
    })
    .optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  min_length: z.number().optional(),
  max_length: z.number().optional(),
});

export type ConditionRule = z.infer<typeof ConditionRuleSchema>;
export type CompoundCondition = z.infer<typeof CompoundConditionSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Display = z.infer<typeof DisplaySchema>;
export type Validation = z.infer<typeof ValidationSchema>;

/**
 * Extra props passed to control components by the field renderer based on evaluated conditions.
 */
export interface ConditionRenderProps {
  isRequired?: boolean;
  patternValidation?: { regex: string; message?: string };
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

const BaseFieldSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  type: z.literal('keyword'),
  display: DisplaySchema.optional(),
  validation: ValidationSchema.optional(),
  metadata: z
    .object({
      default: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export const InputTextFieldSchema = BaseFieldSchema.extend({
  control: z.literal('INPUT_TEXT'),
});

export const InputNumberFieldSchema = BaseFieldSchema.extend({
  control: z.literal('INPUT_NUMBER'),
  type: z.union([
    z.literal('long'),
    z.literal('integer'),
    z.literal('short'),
    z.literal('byte'),
    z.literal('double'),
    z.literal('float'),
    z.literal('half_float'),
    z.literal('scaled_float'),
    z.literal('unsigned_long'),
  ]),
  metadata: z
    .object({
      default: z.number().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export const SelectBasicFieldSchema = BaseFieldSchema.extend({
  control: z.literal('SELECT_BASIC'),
  metadata: z
    .object({
      options: z.array(z.string()),
    })
    .catchall(z.unknown()),
});

export const TextareaFieldSchema = BaseFieldSchema.extend({
  control: z.literal('TEXTAREA'),
});

/**
 * This can be used to parse `fields` section in the YAML `definition` of the template.
 */
export const FieldSchema = z.discriminatedUnion('control', [
  InputTextFieldSchema,
  InputNumberFieldSchema,
  SelectBasicFieldSchema,
  TextareaFieldSchema,
]);
