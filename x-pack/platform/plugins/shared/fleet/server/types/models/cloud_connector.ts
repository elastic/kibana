/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const CloudConnectorBaseFields = {
  name: schema.string(),
  namespace: schema.maybe(schema.string()),
  cloudProvider: schema.string(),
  vars: schema.any(),
  created_at: schema.string(),
  updated_at: schema.string(),
};

export const CloudConnectorSchemaV1 = schema.object({
  ...CloudConnectorBaseFields,
  packagePolicyCount: schema.number(),
});

export const CloudConnectorSchemaV2 = schema.object({
  ...CloudConnectorBaseFields,
  accountType: schema.maybe(schema.string()),
  packagePolicyCount: schema.number(),
});

export const CloudConnectorSchemaV3 = schema.object({
  ...CloudConnectorBaseFields,
  accountType: schema.maybe(schema.string()),
});

export const CloudConnectorSchemaV4 = CloudConnectorSchemaV3.extends({
  verification_status: schema.maybe(schema.string()),
  verification_started_at: schema.maybe(schema.string()),
  verification_failed_at: schema.maybe(schema.string()),
});
