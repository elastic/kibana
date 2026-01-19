/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { lensCMGetResultSchema } from '../../../../content_management';
import { lensResponseItemSchema } from './common';

export const lensGetRequestParamsSchema = schema.object(
  {
    id: schema.string({
      meta: {
        description: 'The saved object id of a Lens visualization.',
      },
    }),
  },
  { unknowns: 'forbid' }
);

export const lensGetResponseBodySchema = schema.object(
  {
    id: lensResponseItemSchema.getPropSchemas().id,
    data: lensResponseItemSchema.getPropSchemas().data,
    meta: schema.object(
      {
        ...lensCMGetResultSchema.getPropSchemas().meta.getPropSchemas(), // include CM meta data
        ...lensResponseItemSchema.getPropSchemas().meta.getPropSchemas(),
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);
