/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils/config_builder';

import { lensCMCreateOptionsSchema, lensItemDataSchema } from '../../../../content_management/v1';
import { lensItemDataSchemaV0 } from '../../../../content_management/v0';
import { pickFromObjectSchema } from '../../../../utils';
import { lensResponseItemSchema } from './common';

export const lensCreateRequestQuerySchema = schema.object(
  {
    ...pickFromObjectSchema(lensCMCreateOptionsSchema.getPropSchemas(), ['overwrite']),
  },
  { unknowns: 'forbid' }
);

export const lensCreateRequestBodySchema = schema.oneOf([
  lensApiStateSchema,
  lensItemDataSchema,
  lensItemDataSchemaV0, // Temporarily permit passing old v0 SO attributes on create
]);

export const lensCreateResponseBodySchema = lensResponseItemSchema;
