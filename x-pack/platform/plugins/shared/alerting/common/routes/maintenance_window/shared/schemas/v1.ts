/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowCategoryIdTypes, maintenanceWindowStatus } from '../constants/v1';

export const maintenanceWindowCategoryIdsSchema = schema.maybe(
  schema.nullable(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(maintenanceWindowCategoryIdTypes.OBSERVABILITY),
        schema.literal(maintenanceWindowCategoryIdTypes.SECURITY_SOLUTION),
        schema.literal(maintenanceWindowCategoryIdTypes.MANAGEMENT),
      ])
    )
  )
);

export const maintenanceWindowStatusSchema = schema.oneOf([
  schema.literal(maintenanceWindowStatus.RUNNING),
  schema.literal(maintenanceWindowStatus.FINISHED),
  schema.literal(maintenanceWindowStatus.UPCOMING),
  schema.literal(maintenanceWindowStatus.ARCHIVED),
]);

export const maintenanceWindowPageSchema = schema.number({
  defaultValue: 1,
  min: 1,
  max: 100,
  meta: {
    description: 'The page number to return.',
  },
});

export const maintenanceWindowPerPageSchema = schema.number({
  defaultValue: 10,
  min: 1,
  max: 100,
  meta: {
    description: 'The number of maintenance windows to return per page.',
  },
});
