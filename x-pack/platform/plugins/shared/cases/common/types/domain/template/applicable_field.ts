/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Where an applicable field comes from:
 * - `global` — an `isGlobal` field-library definition, writable on any case for the owner.
 * - `template` — a field contributed by the applied template (in addition to the global fields).
 */
export const ApplicableFieldSourceSchema = z.enum(['global', 'template']);
export type ApplicableFieldSource = z.infer<typeof ApplicableFieldSourceSchema>;

/**
 * A fully-formed, ready-to-apply description of a single field a caller may write to a case's
 * `extended_fields`. `key` is the storage key (e.g. `priority_as_keyword`) — the exact key to
 * place in the `extended_fields` map. `type`/`control` come straight from the validated field
 * definition, so their values are already constrained upstream.
 */
export const ApplicableFieldSchema = z.object({
  /** Storage key to write in `extended_fields`, e.g. `priority_as_keyword`. */
  key: z.string(),
  /** Field name as authored in the field definition. */
  name: z.string(),
  /** Human-readable label; falls back to `name` when no label is authored. */
  label: z.string(),
  /** Storage type: `keyword` | `integer` | `long` | `boolean` | `date` | … */
  type: z.string(),
  /** UI control: `INPUT_TEXT` | `SELECT_BASIC` | `TOGGLE` | `MARKDOWN` | … */
  control: z.string(),
  /** Whether the field is required at write time. */
  required: z.boolean(),
  /** Whether the field must be filled before the case can be closed. */
  requiredOnClose: z.boolean(),
  /**
   * `true` for display-only controls (e.g. `MARKDOWN`). Such fields are returned so clients can
   * render the full form shape, but they hold no value — writing their `key` is rejected.
   */
  displayOnly: z.boolean(),
  /** Allowed values for `SELECT_BASIC` / `RADIO_GROUP` / `CHECKBOX_GROUP`. */
  options: z.array(z.string()).optional(),
  /** Default value, coerced to a string, when the field definition declares one. */
  defaultValue: z.string().optional(),
  source: ApplicableFieldSourceSchema,
  isGlobal: z.boolean(),
});
export type ApplicableField = z.infer<typeof ApplicableFieldSchema>;

export const ApplicableFieldsResponseSchema = z.object({
  fields: z.array(ApplicableFieldSchema),
});
export type ApplicableFieldsResponse = z.infer<typeof ApplicableFieldsResponseSchema>;
