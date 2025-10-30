/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { scheduleRruleSchemaV3 } from '@kbn/task-manager-plugin/server';
import type { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

export const updateScheduledReportParamsSchema = schema.object({
  id: schema.string(),
});

export const updateScheduledReportBodySchema = schema.object({
  title: schema.maybe(schema.string()),
  schedule: schema.maybe(scheduleRruleSchemaV3),
});

export type SerializedTitles = TypeOf<typeof serializedTitlesSchema>;
