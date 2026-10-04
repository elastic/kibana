/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV10 } from './v10';

/**
 * `status_key` points at a configured status; `status` keeps holding its category.
 */
export const casesSchema = casesSchemaV10.extends({
  status_key: schema.maybe(schema.nullable(schema.string())),
});
