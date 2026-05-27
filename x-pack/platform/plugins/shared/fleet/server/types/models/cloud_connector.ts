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
  // Permission identifiers: AWS ARNs cap ~200 chars; service:Action style ~50.
  action: schema.string({ maxLength: 256 }),
  status: schema.oneOf([
    schema.literal('verified'),
    schema.literal('required'),
    schema.literal('denied'),
    schema.literal('error'),
    schema.literal('skipped'),
  ]),
  required: schema.boolean(),
  // Cloud-provider error codes follow naming conventions: AccessDenied, Throttling, etc.
  error_code: schema.maybe(schema.string({ maxLength: 100 })),
  // Human-readable provider messages (e.g. STS errors include assumed-role principal).
  message: schema.maybe(schema.string({ maxLength: 2000 })),
});

// Mirrors `PackagePolicyPermissionSummary` in common/types/models/cloud_connector.ts.
// Only the fields the UI actually reads are stored; descriptive metadata (display
// name, package title, version) is resolved live from the package policy SO at
// render time.
export const PackagePolicyPermissionSummarySchema = schema.object({
  // SO IDs (UUIDs are 36 chars; 64 leaves headroom for any prefix scheme).
  package_policy_id: schema.string({ maxLength: 64 }),
  policy_id: schema.string({ maxLength: 64 }),
  // Slugs: 'cspm', 'asset_inventory'; package names: 'cloud_security_posture'.
  policy_template: schema.string({ maxLength: 100 }),
  package_name: schema.string({ maxLength: 100 }),
  // ISO-8601 timestamp: '2026-05-27T10:16:00.123Z' = ~25 chars.
  last_verified_at: schema.string({ maxLength: 40 }),
  // Each policy template probes a small fixed set (cloudtrail ~5, asset_inventory ~10).
  // 1000 is ~100× the realistic ceiling while still bounding worst-case validation cost.
  permissions: schema.arrayOf(PermissionResultSchema, { maxSize: 1000 }),
});

export const CloudConnectorSchemaV5 = CloudConnectorSchemaV4.extends({
  // Aligns with MAX_PACKAGE_POLICY_BUCKETS_PER_CONNECTOR (25) × 40 headroom factor;
  // bounds the array at the schema layer so abusive payloads are rejected before
  // any aggregator processing.
  verification_permissions: schema.maybe(
    schema.arrayOf(PackagePolicyPermissionSummarySchema, { maxSize: 1000 })
  ),
});
