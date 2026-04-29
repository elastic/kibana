/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scheduleRruleSchemaV3 } from '@kbn/task-manager-plugin/server';
import { rawScheduledReportSchema as rawScheduledReportSchemaV2 } from './v2';
export * from './v2';

export const rawScheduledReportSchema = rawScheduledReportSchemaV2.extends({
  schedule: scheduleRruleSchemaV3,
});
