/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV7 } from './v7';

export const casesSchema = casesSchemaV7.extends({
  total_observables: schema.number(),
});
