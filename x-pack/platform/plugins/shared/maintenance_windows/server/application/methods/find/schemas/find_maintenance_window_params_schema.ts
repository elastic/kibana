/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const maintenanceWindowsStatusSchema = schema.oneOf([
  schema.literal('running'),
  schema.literal('finished'),
  schema.literal('upcoming'),
  schema.literal('archived'),
  schema.literal('disabled'),
]);

export const findMaintenanceWindowsParamsSchema = schema.object({
  status: schema.maybe(schema.arrayOf(maintenanceWindowsStatusSchema)),
  search: schema.maybe(schema.string()),
  searchFields: schema.maybe(schema.arrayOf(schema.string())),
  perPage: schema.maybe(schema.number()),
  page: schema.maybe(schema.number()),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
});
