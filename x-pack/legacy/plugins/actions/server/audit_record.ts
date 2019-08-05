/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const AuditRecordSchema = schema.object({
  actionTypeId: schema.string(),
  id: schema.string(),
  operation: schema.string(),
  status: schema.string(),
  message: schema.maybe(schema.string()),
});

export type AuditRecordType = TypeOf<typeof AuditRecordSchema>;
