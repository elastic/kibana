/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV10 } from './v10';

/**
 * Adds the optional `access` object. A missing value or `mode: 'default'`
 * means the case is visible to everyone with Cases privileges in the space;
 * `mode: 'restricted'` limits visibility to the case's assignees.
 */
export const casesSchema = casesSchemaV10.extends({
  access: schema.maybe(
    schema.object({
      mode: schema.oneOf([schema.literal('default'), schema.literal('restricted')]),
    })
  ),
});
