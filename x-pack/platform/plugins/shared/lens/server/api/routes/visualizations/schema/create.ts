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
} from '../../../../../common/content_management';

export const lensCreateRequestBodySchema = schema.object(
  {
    data: schema.object(
      {
        ...lensAPIAttributesSchema.getPropSchemas(),
        // omit id on create options
        ...pickFromObjectSchema(lensAPIConfigSchema.getPropSchemas(), ['references']),
      },
      { unknowns: 'forbid' }
    ),
    // TODO should these options be here?
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
