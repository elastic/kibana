/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { scheduleRruleSchemaV3 } from '@kbn/task-manager-plugin/server';

export const updateScheduledReportSchema = schema.object({
  title: schema.maybe(schema.string()),
  schedule: schema.maybe(scheduleRruleSchemaV3),
});
