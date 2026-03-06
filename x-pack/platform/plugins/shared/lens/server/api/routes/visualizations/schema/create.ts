/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils/config_builder';

import { lensCMCreateOptionsSchema } from '../../../../content_management';
import { pickFromObjectSchema } from '../../../../utils';
import { lensResponseItemSchema } from './common';

export const lensCreateRequestParamsSchema = schema.object(
  {
    id: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

export const lensCreateRequestQuerySchema = schema.object(
  {
    ...pickFromObjectSchema(lensCMCreateOptionsSchema.getPropSchemas(), ['overwrite']),
  },
  { unknowns: 'forbid' }
);

export const lensCreateRequestBodySchema = lensApiStateSchema;

export const lensCreateResponseBodySchema = lensResponseItemSchema;
