/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { omit } from 'lodash';
import {
  lensResponseItemSchema,
  lensAPIAttributesSchema,
  lensAPIConfigSchema,
  lensCMUpdateOptionsSchema,
} from '../../../../content_management';
import { pickFromObjectSchema } from '../../../../utils';

export const lensUpdateRequestParamsSchema = schema.object(
  {
    id: schema.string({
      meta: {
        description: 'The saved object id of a Lens visualization.',
      },
    }),
  },
  { unknowns: 'forbid' }
);

export const lensUpdateRequestBodySchema = schema.object(
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
        ...omit(lensCMUpdateOptionsSchema.getPropSchemas(), ['references']),
      },
      { unknowns: 'forbid' }
    ),
  },
  {
    unknowns: 'forbid',
  }
);

export const lensUpdateResponseBodySchema = lensResponseItemSchema;
