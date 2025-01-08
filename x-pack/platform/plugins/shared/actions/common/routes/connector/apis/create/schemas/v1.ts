/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateEmptyStrings } from '../../../../../validate_empty_strings';

export const createConnectorRequestParamsSchema = schema.maybe(
  schema.object({
    id: schema.maybe(schema.string({ meta: { description: 'An identifier for the connector.' } })),
  })
);

export const createConnectorRequestBodySchema = schema.object({
  name: schema.string({
    validate: validateEmptyStrings,
    meta: { description: 'The display name for the connector.' },
  }),
  connector_type_id: schema.string({
    validate: validateEmptyStrings,
    meta: { description: 'The type of connector.' },
  }),
  config: schema.recordOf(schema.string(), schema.any({ validate: validateEmptyStrings }), {
    defaultValue: {},
  }),
  secrets: schema.recordOf(schema.string(), schema.any({ validate: validateEmptyStrings }), {
    defaultValue: {},
  }),
});
