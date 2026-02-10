/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Attributes for the notification policy saved object.
 */
export const notificationPolicySavedObjectAttributesSchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  workflow_id: schema.string(),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.nullable(schema.string()),
});
