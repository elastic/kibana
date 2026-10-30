/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import { z, lazySchema } from '@kbn/zod/v4';

const controlWidthSchema = z
  .enum(['small', 'medium', 'large'])
  .describe('Control width. Defaults to "medium".');

const dataControlFields = {
  field_name: z
    .string()
    .min(1)
    .max(256)
    .describe('Exact name of a field mapped on `index` (e.g. "service.name").'),
  index: lazySchema(() =>
    z
      .string()
      .min(1)
      .max(256)
      .describe(
        'Index, alias, or datastream to query for values. Use the same index as the panels the control filters (e.g. "logs-*").'
      )
  ),
};

const controlLayoutFields = {
  width: controlWidthSchema.optional(),
  grow: z
    .boolean()
    .optional()
    .describe('Expand to fill available horizontal space. Defaults to true.'),
};

const userRequestedFields = {
  user_requested: lazySchema(() =>
    z
      .boolean()
      .optional()
      .describe(
        'True only when the user asked explicitly for the controls. A control that cannot be added is then reported in `failures` instead of left out silently.'
      )
  ),
};

const controlIdFields = {
  id: lazySchema(() =>
    z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Control id. An existing control id replaces that control in place with this definition, so omitted fields take their defaults; a new id adds a control with this id. Omit it to add a control with a generated readable id, shown in the result.'
      )
  ),
};

const dataControlInputFields = {
  ...controlIdFields,
  ...dataControlFields,
  title: z.string().max(256).optional().describe('Human-readable label shown above the control.'),
  ...userRequestedFields,
  ...controlLayoutFields,
};

/** Options lists and range sliders take the same fields, so they share one schema. */
const dataControlInputSchema = z.object({
  type: z.enum([OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL]),
  ...dataControlInputFields,
});

const timeSliderControlInputSchema = z.object({
  type: z.literal(TIME_SLIDER_CONTROL),
  ...controlIdFields,
  ...userRequestedFields,
  ...controlLayoutFields,
});

export const controlInputSchema = z.discriminatedUnion('type', [
  dataControlInputSchema,
  timeSliderControlInputSchema,
]);

export type ControlInput = z.infer<typeof controlInputSchema>;
