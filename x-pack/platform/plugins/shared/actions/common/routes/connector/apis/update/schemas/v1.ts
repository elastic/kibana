/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateEmptyStrings } from '../../../../../validate_empty_strings';

export const updateConnectorParamsSchema = schema.object({
  id: schema.string({
    meta: { description: 'An identifier for the connector.' },
  }),
});

export const updateConnectorBodySchema = schema.object({
  name: schema.string({
    validate: validateEmptyStrings,
    meta: { description: 'The display name for the connector.' },
  }),
  config: schema.recordOf(schema.string(), schema.any({ validate: validateEmptyStrings }), {
    defaultValue: {},
  }),
  secrets: schema.recordOf(schema.string(), schema.any({ validate: validateEmptyStrings }), {
    defaultValue: {},
  }),
});
