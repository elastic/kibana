/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ITEM_VERSION_V2 } from '@kbn/lens-common/content_management/constants';
import { createVersionedLensSchemas } from '../../schema/versioned';

export const {
  lensItemAttributesSchema: lensItemAttributesSchemaV2,
  lensSavedObjectSchema: lensSavedObjectSchemaV2,
  lensItemSchema: lensItemSchemaV2,
  lensCommonSavedObjectSchema: lensCommonSavedObjectSchemaV2,
  lensItemDataSchema: lensItemDataSchemaV2,
} = createVersionedLensSchemas(LENS_ITEM_VERSION_V2);
