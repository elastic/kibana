/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowCategoryIdTypes as maintenanceWindowCategoryIdTypesV1 } from '../constants/v1';

export const maintenanceWindowCategoryIdsSchema = schema.maybe(
  schema.nullable(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(maintenanceWindowCategoryIdTypesV1.OBSERVABILITY),
        schema.literal(maintenanceWindowCategoryIdTypesV1.SECURITY_SOLUTION),
        schema.literal(maintenanceWindowCategoryIdTypesV1.MANAGEMENT),
      ])
    )
  )
);
