/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  BY_REF_SCHEMA_META,
  BY_VALUE_SCHEMA_META,
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { customAppStateSchema } from '@kbn/custom-app-common';

/** An app that lives in the dashboard, with its document in the panel. */
export const customAppByValueStateSchema = z
  .object({
    ...customAppStateSchema.shape,
    ...serializedTitlesSchema.shape,
    ...serializedTimeRangeSchema.shape,
  })
  .meta(BY_VALUE_SCHEMA_META);

/** An app that lives in the library: the panel keeps only which one, and its own titles and range. */
export const customAppByReferenceStateSchema = z
  .object({
    ...serializedTitlesSchema.shape,
    ...serializedTimeRangeSchema.shape,
    ref_id: z.string().meta({ description: 'The unique identifier of the custom app.' }),
  })
  .meta(BY_REF_SCHEMA_META);

export const customAppEmbeddableSchema = z
  .union([customAppByValueStateSchema, customAppByReferenceStateSchema])
  .meta({ description: 'Custom app panel config' });

export type CustomAppByValueState = z.output<typeof customAppByValueStateSchema>;
export type CustomAppByReferenceState = z.output<typeof customAppByReferenceStateSchema>;
export type CustomAppEmbeddableState = z.output<typeof customAppEmbeddableSchema>;
