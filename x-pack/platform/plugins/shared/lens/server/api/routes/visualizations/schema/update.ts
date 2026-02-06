/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils/config_builder';

import { lensCMUpdateOptionsSchema, lensItemDataSchemaV2 } from '../../../../content_management';
import { lensItemDataSchemaV0 } from '../../../../content_management/v0';
import { lensItemDataSchemaV1 } from '../../../../content_management/v1';
import { lensResponseItemSchema } from './common';

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

export const lensUpdateRequestQuerySchema = schema.object(
  {
    ...omit(lensCMUpdateOptionsSchema.getPropSchemas(), ['references']),
  },
  { unknowns: 'forbid' }
);

export const lensUpdateRequestBodySchema = schema.oneOf([
  lensApiStateSchema,
  lensItemDataSchemaV2,
  lensItemDataSchemaV1,
  lensItemDataSchemaV0, // Temporarily permit passing old v0 SO attributes on create
]);

export const lensUpdateResponseBodySchema = schema.object(
  {
    id: lensResponseItemSchema.getPropSchemas().id,
    data: lensResponseItemSchema.getPropSchemas().data,
    meta: schema.object(
      {
        ...lensResponseItemSchema.getPropSchemas().meta.getPropSchemas(),
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);
