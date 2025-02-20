/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRulesSettingsSchema as rawRulesSettingsSchemaV1 } from './v1';

export const rawRulesSettingsSchema = rawRulesSettingsSchemaV1.extends({
  alertDeletion: schema.maybe(
    schema.object({
      createdAt: schema.string(),
      createdBy: schema.nullable(schema.string()),
      isActiveAlertsDeletionEnabled: schema.boolean(),
      isInactiveAlertsDeletionEnabled: schema.boolean(),
      activeAlertsDeletionThreshold: schema.number({ min: 1, max: 1000 }),
      inactiveAlertsDeletionThreshold: schema.number({ min: 1, max: 1000 }),
      updatedAt: schema.string(),
      updatedBy: schema.nullable(schema.string()),
    })
  ),
});
