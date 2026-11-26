/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_CONNECTOR_TYPE_ID_LENGTH } from '@kbn/connector-specs';
import { CONNECTOR_SPEC_VERSION_MAX_LENGTH } from '../../../../..';

export const getConnectorSpecParamsSchema = schema.object({
  id: schema.string({
    minLength: 1,
    maxLength: MAX_CONNECTOR_TYPE_ID_LENGTH,
    meta: {
      description: 'The connector type identifier.',
    },
  }),
});

export const getConnectorSpecQuerySchema = (includeSpecVersionField: boolean) =>
  schema.object({
    ...(includeSpecVersionField && {
      spec_version: schema.maybe(
        schema.version({
          maxLength: CONNECTOR_SPEC_VERSION_MAX_LENGTH,
          meta: {
            description:
              'The connector schema version, as a major (for example, "1") or exact major.minor (for example, "1.3").',
          },
        })
      ),
    }),
  });
