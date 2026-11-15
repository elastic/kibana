/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  lensCommonSavedObjectSchemaV3,
  lensItemDataSchemaV3,
  lensSavedObjectSchemaV3,
} from '../../../../../content_management/zod';
import { lensApiConfigLibItemSchemaNoESQL } from '../../../visualizations/schema/common';

/**
 * The Lens item meta returned from the server
 */
export const lensItemMetaSchema = lensCommonSavedObjectSchemaV3
  .pick({
    type: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    updatedBy: true,
    originId: true,
    managed: true,
  })
  .strict();

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = z
  .object({
    id: lensSavedObjectSchemaV3.shape.id,
    data: z.union([lensApiConfigLibItemSchemaNoESQL, lensItemDataSchemaV3]),
    meta: lensItemMetaSchema,
  })
  .strict()
  .meta({ id: 'visualizationResponse' });
