/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const genericErrorResponse = () =>
  schema.object(
    {
      statusCode: schema.maybe(schema.number()),
      error: schema.maybe(schema.string()),
      message: schema.string(),
      attributes: schema.maybe(schema.any()),
    },
    {
      meta: { description: 'Generic Error' },
    }
  );

export const notFoundResponse = () =>
  schema.object({
    message: schema.string(),
  });

export const internalErrorResponse = () =>
  schema.object(
    {
      message: schema.string(),
    },
    { meta: { description: 'Internal Server Error' } }
  );
