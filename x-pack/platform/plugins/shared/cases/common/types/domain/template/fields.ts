/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const BaseFieldSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  type: z.literal('keyword'),
  metadata: z.object({}).catchall(z.unknown()).optional(),
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
});

export const SelectBasicFieldSchema = BaseFieldSchema.extend({
  control: z.literal('SELECT_BASIC'),
  metadata: z
    .object({
      options: z.array(z.string()),
      default: z.string().optional(),
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
