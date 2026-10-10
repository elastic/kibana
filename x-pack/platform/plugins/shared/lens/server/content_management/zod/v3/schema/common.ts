/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ITEM_VERSION_V3 } from '@kbn/lens-common/content_management/constants';
import { createVersionedLensSchemas } from '../../schema/versioned';

export const {
  lensItemAttributesSchema: lensItemAttributesSchemaV3,
  lensSavedObjectSchema: lensSavedObjectSchemaV3,
  lensItemSchema: lensItemSchemaV3,
  lensCommonSavedObjectSchema: lensCommonSavedObjectSchemaV3,
  lensItemDataSchema: lensItemDataSchemaV3,
} = createVersionedLensSchemas(LENS_ITEM_VERSION_V3);
