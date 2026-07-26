/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiConfigSchemaNoESQL } from '@kbn/lens-embeddable-utils';

import { lensResponseItemSchema } from './common';

export const lensUpdateRequestParamsSchema = schema.object(
  {
    id: schema.string({
      meta: {
        description: 'The visualization identifier, as returned by the create or search endpoints.',
      },
    }),
  },
  { unknowns: 'forbid' }
);

export const lensUpdateRequestBodySchema = lensApiConfigSchemaNoESQL;

export const lensUpdateResponseBodySchema = lensResponseItemSchema;
