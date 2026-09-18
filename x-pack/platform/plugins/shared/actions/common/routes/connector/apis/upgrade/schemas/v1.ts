/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CONNECTOR_ID_MAX_LENGTH } from '../../../../..';

export const upgradeConnectorParamsSchema = schema.object({
  id: schema.string({
    minLength: 1,
    maxLength: CONNECTOR_ID_MAX_LENGTH,
    meta: {
      description: 'An identifier for the connector.',
    },
  }),
});

export const upgradeConnectorBodySchema = schema.object(
  {
    spec_version: schema.string({
      minLength: 1,
      maxLength: 32,
      meta: {
        description:
          'Target spec version. Must equal the catalog-active version of the connector type.',
      },
    }),
  },
  { meta: { id: 'upgrade_connector_request' } }
);
