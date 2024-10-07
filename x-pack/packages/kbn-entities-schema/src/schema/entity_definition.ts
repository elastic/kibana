/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  arrayOfStringsSchema,
  keyMetricSchema,
  metadataSchema,
  filterSchema,
  durationSchema,
  identityFieldsSchema,
  semVerSchema,
  historySettingsSchema,
  durationSchemaWithMinimum,
} from './common';

const IndexPatternsSchema = z.object({
  indexPatterns: arrayOfStringsSchema,
});

const DataViewIdSchema = z.object({
  data_view_id: z.string(),
});

const baseEntityDefinitionSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  version: semVerSchema,
  name: z.string(),
  description: z.optional(z.string()),
  type: z.string(),
  filter: filterSchema,
  identityFields: z.array(identityFieldsSchema),
  displayNameTemplate: z.string(),
  metadata: z.optional(z.array(metadataSchema)),
  metrics: z.optional(z.array(keyMetricSchema)),
  staticFields: z.optional(z.record(z.string(), z.string())),
  managed: z.optional(z.boolean()).default(false),
  history: z.object({
    timestampField: z.string(),
    interval: durationSchemaWithMinimum(1),
    settings: historySettingsSchema,
  }),
  latest: z.optional(
    z.object({
      settings: z.optional(
        z.object({
          syncField: z.optional(z.string()),
          syncDelay: z.optional(durationSchema),
          frequency: z.optional(durationSchema),
        })
      ),
    })
  ),
  installStatus: z.optional(
    z.union([
      z.literal('installing'),
      z.literal('upgrading'),
      z.literal('installed'),
      z.literal('failed'),
    ])
  ),
  installStartedAt: z.optional(z.string()),
});

const entityDefinitionSchemaWithIndexPatterns =
  baseEntityDefinitionSchema.merge(IndexPatternsSchema);
const entityDefinitionSchemaWithDataViewId = baseEntityDefinitionSchema.merge(DataViewIdSchema);

export const entityDefinitionSchema = z.union([
  entityDefinitionSchemaWithIndexPatterns,
  entityDefinitionSchemaWithDataViewId,
]);

// TODO do wer need to add this check for the update schema?
// can we change indexpatterns during update?
// export const entityDefinitionSchema = baseEntityDefinitionSchema.superRefine((data, ctx) => {
//   if (!data.indexPatterns && !data.data_view_id) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       path: ['data_view_id'],
//       message: "data_view_id should be set if indexPatterns isn't",
//     });
//   }
// });
// I couldn't use union because it doesn't support partial and merge
// z.union([z.object({ indexPatterns: arrayOfStringsSchema }), z.object({ data_view_id: z.string() })]);
// .or(z.object({ data_view_id: z.string() }));

export const entityDefinitionUpdateSchema = baseEntityDefinitionSchema
  .omit({
    id: true,
    managed: true,
    installStatus: true,
    installStartedAt: true,
  })
  .merge(IndexPatternsSchema)
  .merge(DataViewIdSchema)
  .partial()
  .merge(
    z.object({
      history: z.optional(baseEntityDefinitionSchema.shape.history.partial()),
      version: semVerSchema,
    })
  );

export type EntityDefinition = z.infer<typeof entityDefinitionSchema>;
export type EntityDefinitionUpdate = z.infer<typeof entityDefinitionUpdateSchema>;

export type EntityDefinitionSchemaWithIndexPatterns = z.infer<
  typeof entityDefinitionSchemaWithIndexPatterns
>;
export type EntityDefinitionSchemaWithDataViewId = z.infer<
  typeof entityDefinitionSchemaWithDataViewId
>;

export const isEntityDefinitionWithIndexPattern = (
  definition: EntityDefinition
): definition is EntityDefinitionSchemaWithIndexPatterns => {
  return (definition as EntityDefinitionSchemaWithIndexPatterns).indexPatterns !== undefined;
};
