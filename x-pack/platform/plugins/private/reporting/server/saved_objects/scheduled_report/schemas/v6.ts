/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawScheduledReportSchema as rawScheduledReportSchemaV5 } from './v5';
export * from './v5';

export const rawScheduledReportSchema = rawScheduledReportSchemaV5.extends({
  // Stable id of the creator: a profile uid, or `realm:[type,name,username]`. Absent on documents
  // created before this version.
  createdById: schema.maybe(schema.string()),
});
