/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV11 } from './v11';

export const casesSchema = casesSchemaV11.extends({
  closed_by_merge: schema.maybe(schema.boolean()),
  merged: schema.maybe(schema.boolean()),
});
