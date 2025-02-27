/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { OutputSchema, UpdateOutputSchema } from '../models';
import { ListResponseSchema } from '../../routes/schema/utils';

export const GetOneOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const DeleteOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const DeleteOutputResponseSchema = schema.object({
  id: schema.string(),
});

export const GenerateLogstashApiKeyResponseSchema = schema.object({
  api_key: schema.string(),
});

export const GetOutputsRequestSchema = {};

export const GetOutputsResponseSchema = ListResponseSchema(
  OutputSchema.extendsDeep({
    unknowns: 'allow',
  })
);

export const PostOutputRequestSchema = {
  body: OutputSchema,
};

export const PutOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
  body: UpdateOutputSchema,
};

export const GetLatestOutputHealthRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const GetLatestOutputHealthResponseSchema = schema.object({
  state: schema.string({
    meta: {
      description: 'state of output, HEALTHY or DEGRADED',
    },
  }),
  message: schema.string({
    meta: {
      description: 'long message if unhealthy',
    },
  }),
  timestamp: schema.string({
    meta: {
      description: 'timestamp of reported state',
    },
  }),
});
