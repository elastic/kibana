/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { scheduleRruleSchemaV3 } from '@kbn/task-manager-plugin/server';
import { rawNotificationSchema } from '../../../../saved_objects/scheduled_report/schemas/latest';

export const updateScheduledReportParamsSchema = schema.object({
  id: schema.string(),
});

export const updateScheduledReportBodySchema = schema.object({
  title: schema.maybe(schema.string()),
  schedule: schema.maybe(scheduleRruleSchemaV3),
  notification: schema.maybe(rawNotificationSchema),
});
