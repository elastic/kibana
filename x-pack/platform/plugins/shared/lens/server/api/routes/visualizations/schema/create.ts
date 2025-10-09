/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  lensResponseItemSchema,
  lensAPIConfigSchema,
  lensCMCreateOptionsSchema,
} from '../../../../content_management';
import { lensItemSchemaV0 } from '../../../../content_management/v0';
import { pickFromObjectSchema } from '../../../../utils';

const apiConfigData = lensAPIConfigSchema.extends({
  id: undefined,
});

const v0ConfigData = lensItemSchemaV0.extends({
  id: undefined,
});

export const lensCreateRequestBodySchema = schema.object(
  {
    data: schema.oneOf([
      apiConfigData,
      v0ConfigData, // Temporarily permit passing old v0 SO attributes on create
    ]),
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
