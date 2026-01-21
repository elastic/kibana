/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowResponseSchemaV1 } from '../../../response';
import {
  maintenanceWindowStatusSchema,
  maintenanceWindowPageSchema,
  maintenanceWindowPerPageSchema,
} from '../../../../shared/schemas/v1';
import { validatePagination } from '../../../../shared/validation/v1';

export const findMaintenanceWindowsQuerySchema = schema.object(
  {
    title: schema.maybe(
      schema.string({
        meta: {
          description: 'The title of the maintenance window.',
        },
      })
    ),
    created_by: schema.maybe(
      schema.string({
        meta: {
          description: 'The user who created the maintenance window.',
        },
      })
    ),
    status: schema.maybe(
      schema.oneOf([maintenanceWindowStatusSchema, schema.arrayOf(maintenanceWindowStatusSchema)], {
        meta: {
          description:
            'The status of the maintenance window. It can be "running", "upcoming", "finished", "archived", or "disabled".',
        },
      })
    ),
    page: maintenanceWindowPageSchema,
    per_page: maintenanceWindowPerPageSchema,
  },
  {
    validate: validatePagination,
  }
);

export const findMaintenanceWindowsResponseSchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  maintenanceWindows: schema.arrayOf(maintenanceWindowResponseSchemaV1),
});
