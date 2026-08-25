/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema } from '@kbn/zod';
import { LENS_ITEM_VERSION_V1 } from '@kbn/lens-common/content_management/constants';
import { createVersionedLensSchemas } from '../../schema/versioned';

const _v1Schemas = createVersionedLensSchemas(LENS_ITEM_VERSION_V1);

export const lensItemAttributesSchemaV1 = lazySchema(() => _v1Schemas.lensItemAttributesSchema);
export const lensSavedObjectSchemaV1 = lazySchema(() => _v1Schemas.lensSavedObjectSchema);
export const lensItemSchemaV1 = lazySchema(() => _v1Schemas.lensItemSchema);
export const lensCommonSavedObjectSchemaV1 = lazySchema(
  () => _v1Schemas.lensCommonSavedObjectSchema
);
export const lensItemDataSchemaV1 = lazySchema(() => _v1Schemas.lensItemDataSchema);
