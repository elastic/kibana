/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { FLEET_SCHEMA_ID_MAX_LENGTH } from '../../constants';

import { NewOutputSchema, OutputResponseItemSchema, UpdateOutputSchema } from '../models';
import { ListResponseSchema } from '../../routes/schema/utils';

export const GetOneOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the output' },
    }),
  }),
};

export const DeleteOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the output' },
    }),
  }),
};

export const DeleteOutputResponseSchema = schema.object({
  id: schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH }),
});

export const GenerateLogstashApiKeyResponseSchema = schema.object({
  api_key: schema.string({ maxLength: 1000 }),
});

export const GetOutputsRequestSchema = {};

export const GetOutputsResponseSchema = ListResponseSchema(OutputResponseItemSchema);

export const PostOutputRequestSchema = {
  body: NewOutputSchema,
};

export const PutOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the output' },
    }),
  }),
  body: UpdateOutputSchema,
};

export const GetLatestOutputHealthRequestSchema = {
  params: schema.object({
    outputId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the output' },
    }),
  }),
};

export const GetLatestOutputHealthResponseSchema = schema.object({
  state: schema.string({
    maxLength: 50,
    meta: {
      description: 'state of output, HEALTHY or DEGRADED',
    },
  }),
  message: schema.string({
    maxLength: 10000,
    meta: {
      description: 'long message if unhealthy',
    },
  }),
  timestamp: schema.string({
    maxLength: 50,
    meta: {
      description: 'timestamp of reported state',
    },
  }),
});
