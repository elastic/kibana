/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scheduleRruleSchemaV2 } from '@kbn/task-manager-plugin/server';
import { rawScheduledReportSchema as rawScheduledReportSchemaV1 } from './v1';
export * from './v1';

export const rawScheduledReportSchema = rawScheduledReportSchemaV1.extends({
  schedule: scheduleRruleSchemaV2,
});
