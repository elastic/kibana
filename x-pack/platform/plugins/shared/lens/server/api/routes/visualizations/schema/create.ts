/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  pickFromObjectSchema,
  lensResponseItemSchema,
  lensAPIConfigSchema,
  lensAPIAttributesSchema,
  lensCMCreateOptionsSchema,
} from '../../../../content_management';
import { lensCreateRequestBodyDataSchemaV0 } from '../../../../content_management/v0';

const apiConfigData = schema.object(
  {
    ...lensAPIAttributesSchema.getPropSchemas(),
    // omit id on create options
    ...pickFromObjectSchema(lensAPIConfigSchema.getPropSchemas(), ['references']),
  },
  { unknowns: 'forbid' }
);

export const lensCreateRequestBodySchema = schema.object(
  {
    // Permit passing old v0 SO attributes on create
    data: schema.oneOf([apiConfigData, lensCreateRequestBodyDataSchemaV0]),
    // TODO should these options be here or in params?
    options: schema.object(
      {
        ...pickFromObjectSchema(lensCMCreateOptionsSchema.getPropSchemas(), ['overwrite']),
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);

export const lensCreateResponseBodySchema = lensResponseItemSchema;
