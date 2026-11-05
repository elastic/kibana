/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_OBSERVABLE_METADATA_ENTRIES,
  MAX_OBSERVABLE_METADATA_KEY_LENGTH,
  MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
} from '../../../constants';

/** Editable key/value metadata of an observable, e.g. a VirusTotal link or a verdict. */
export const ObservableMetadataSchema = lazySchema(() =>
  z
    .record(
      z.string().min(1).max(MAX_OBSERVABLE_METADATA_KEY_LENGTH),
      z.string().max(MAX_OBSERVABLE_METADATA_VALUE_LENGTH)
    )
    .refine((metadata) => Object.keys(metadata).length <= MAX_OBSERVABLE_METADATA_ENTRIES, {
      message: `The metadata of an observable can have at most ${MAX_OBSERVABLE_METADATA_ENTRIES} entries.`,
    })
);

export const CaseObservableBaseSchema = lazySchema(() =>
  z.object({
    typeKey: z.string(),
    value: z.string(),
    description: z.string().nullable(),
    metadata: ObservableMetadataSchema.optional(),
  })
);

export const CaseObservableSchema = lazySchema(() =>
  CaseObservableBaseSchema.extend({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
  })
);

export const CaseObservableTypeSchema = z.object({
  key: z.string(),
  label: z.string(),
});

export type Observable = z.infer<typeof CaseObservableSchema>;
export type ObservableMetadata = z.infer<typeof ObservableMetadataSchema>;
export type ObservableType = z.infer<typeof CaseObservableTypeSchema>;
