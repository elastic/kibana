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

export const PermissionResultSchema = schema.object({
  action: schema.string(),
  // Narrow union — must match `PermissionStatus` in common/types/models/cloud_connector.ts.
  // Keep this literal list in sync if new statuses are added.
  status: schema.oneOf([
    schema.literal('verified'),
    schema.literal('required'),
    schema.literal('denied'),
    schema.literal('error'),
    schema.literal('skipped'),
  ]),
  required: schema.boolean(),
  error_code: schema.maybe(schema.string()),
  message: schema.maybe(schema.string()),
});

// Mirrors `PackagePolicyPermissionSummary` in common/types/models/cloud_connector.ts.
// Only the fields the UI actually reads are stored; descriptive metadata (display
// name, package title, version) is resolved live from the package policy SO at
// render time.
export const PackagePolicyPermissionSummarySchema = schema.object({
  package_policy_id: schema.string(),
  policy_id: schema.string(),
  policy_template: schema.string(),
  package_name: schema.string(),
  last_verified_at: schema.string(),
  permissions: schema.arrayOf(PermissionResultSchema),
});

export const CloudConnectorSchemaV5 = CloudConnectorSchemaV4.extends({
  verification_permissions: schema.maybe(schema.arrayOf(PackagePolicyPermissionSummarySchema)),
});
