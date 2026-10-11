/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const getConnectorPublicKeysParamsSchema = schema.object({
  connector_type_id: schema.string({
    minLength: 1,
    maxLength: 128,
    meta: { description: 'The connector type ID.' },
  }),
  connector_id: schema.string({
    minLength: 1,
    maxLength: 128,
    meta: { description: 'An identifier for the connector.' },
  }),
  space_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 128,
      meta: { description: 'The space of the connector.' },
    })
  ),
});
