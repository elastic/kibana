/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_CONNECTOR_TYPE_ID_LENGTH } from '@kbn/connector-specs';

export const getConnectorSpecParamsSchema = schema.object({
  id: schema.string({
    minLength: 1,
    maxLength: MAX_CONNECTOR_TYPE_ID_LENGTH,
    meta: {
      description: 'The connector type identifier.',
    },
  }),
});

export const getConnectorSpecQuerySchema = schema.object({
  spec_version: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 16,
      validate: (value) =>
        /^\d+\.\d+$/.test(value) ? undefined : 'spec version must use the MAJOR.MINOR form',
      meta: {
        description: 'Exact spec version to serve. Omitted: accepted latest of the newest major.',
      },
    })
  ),
});
