/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ITEM_VERSION_V1 } from '@kbn/lens-common/content_management/constants';
import { createVersionedLensSchemas } from '../../schema/versioned';

export const {
  lensItemAttributesSchema: lensItemAttributesSchemaV1,
  lensSavedObjectSchema: lensSavedObjectSchemaV1,
  lensItemSchema: lensItemSchemaV1,
  lensCommonSavedObjectSchema: lensCommonSavedObjectSchemaV1,
  lensItemDataSchema: lensItemDataSchemaV1,
} = createVersionedLensSchemas(LENS_ITEM_VERSION_V1);
