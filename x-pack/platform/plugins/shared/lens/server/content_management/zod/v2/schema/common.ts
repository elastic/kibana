/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema } from '@kbn/zod';
import { LENS_ITEM_VERSION_V2 } from '@kbn/lens-common/content_management/constants';
import { createVersionedLensSchemas } from '../../schema/versioned';

const _v2Schemas = createVersionedLensSchemas(LENS_ITEM_VERSION_V2);

export const lensItemAttributesSchemaV2 = lazySchema(() => _v2Schemas.lensItemAttributesSchema);
export const lensSavedObjectSchemaV2 = lazySchema(() => _v2Schemas.lensSavedObjectSchema);
export const lensItemSchemaV2 = lazySchema(() => _v2Schemas.lensItemSchema);
export const lensCommonSavedObjectSchemaV2 = lazySchema(
  () => _v2Schemas.lensCommonSavedObjectSchema
);
export const lensItemDataSchemaV2 = lazySchema(() => _v2Schemas.lensItemDataSchema);
