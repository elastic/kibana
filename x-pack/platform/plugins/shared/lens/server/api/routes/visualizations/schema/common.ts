/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { lensApiConfigSchemaNoESQL } from '@kbn/lens-embeddable-utils';
import { asCodeMetaSchema, getAsCodeTagsSchema } from '@kbn/as-code-shared-schemas';

import { lensCommonSavedObjectSchemaV2 } from '../../../../content_management/zod';

/**
 * Shared schema only for by-reference Lens API configs saved to library
 */
const lensApiConfigLibItemSharedSchema = z
  .object({
    tags: getAsCodeTagsSchema('Tag IDs to associate with this visualization.'),
  })
  .meta({
    id: 'lensApiConfigLibItemSharedSchema',
    title: 'Library Visualization Item Shared Schema',
  });

/**
 * Schema for Lens API configs by reference library item, only supports DSL configs
 */
export const lensApiConfigLibItemSchemaNoESQL = lensApiConfigSchemaNoESQL
  .and(lensApiConfigLibItemSharedSchema)
  .meta({ id: 'lensApiConfigLibItemNoESQL', title: 'Library Visualization Item' });

export type LensApiConfigLibItemNoESQL = z.output<typeof lensApiConfigLibItemSchemaNoESQL>;

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = z
  .object({
    id: lensCommonSavedObjectSchemaV2.shape.id,
    data: lensApiConfigLibItemSchemaNoESQL,
    meta: asCodeMetaSchema,
  })
  .strict()
  .meta({ id: 'lensResponseItem', title: 'Visualization Response' });
