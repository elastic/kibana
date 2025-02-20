/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const alertDeletionPreviewSchema = schema.object({
  isActiveAlertsDeletionEnabled: schema.boolean(),
  isInactiveAlertsDeletionEnabled: schema.boolean(),
  activeAlertsDeletionThreshold: schema.number({ min: 1 }),
  inactiveAlertsDeletionThreshold: schema.number({ min: 1 }),
});

export const alertDeletionPreviewResponseSchema = schema.object({
  body: schema.object({
    affected_alert_count: schema.number(),
  }),
});
