/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const jobAuditMessagesJobIdSchema = schema.object({
  jobId: schema.maybe(schema.string({ meta: { description: 'Job ID' } })),
});

export const jobAuditMessagesQuerySchema = schema.object({
  from: schema.maybe(schema.string()),
  start: schema.maybe(schema.string()),
  end: schema.maybe(schema.string()),
});

export const clearJobAuditMessagesBodySchema = schema.object({
  jobId: schema.string(),
  notificationIndices: schema.arrayOf(schema.string()),
});
