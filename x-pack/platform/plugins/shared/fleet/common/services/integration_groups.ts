/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: helpers for integration groups. A group is a directory in the integrations repo with
// a `group.yml`; elastic-package bundles it into each member package and sets `group: <dir>`.
// Fleet builds groups from member packages (GET /internal/fleet/epm/groups). The package policy
// always belongs to a member. Schema is a package property (`schema`, else inferred).

import type { IntegrationGroup } from '../types';

export const GROUP_QUERYPARAM = 'group';

/** Raw `group.yml` as bundled in a member package. Shape is provisional (prototype). */
export interface GroupConfigFile {
  title?: string;
  description?: string;
  icon?: string;
  default?: string;
  schema_labels?: Record<string, string>;
  planned_schemas?: string[];
}

interface SchemaSource {
  schema?: string;
  policy_templates?: Array<{ input?: string; inputs?: Array<{ type?: string }> }>;
}

/**
 * Package schema: the manifest `schema`, else `otel` when any policy template input is `otelcol`
 * (input packages: the template's `input`), else `ecs`.
 */
export const getPackageSchema = (manifest: SchemaSource): string => {
  if (manifest.schema) return manifest.schema;
  const usesOtel = (manifest.policy_templates ?? []).some(
    (template) =>
      template.input === 'otelcol' ||
      (template.inputs ?? []).some((input) => input.type === 'otelcol')
  );
  return usesOtel ? 'otel' : 'ecs';
};

/** Member package names of every group, e.g. to hide them from browse. */
export const getGroupMemberNames = (groups: IntegrationGroup[]): Set<string> =>
  new Set(groups.flatMap((g) => g.members.map((m) => m.package)));

/** Schema of the default member, else the first member's. */
export const getGroupDefaultSchema = (
  group: Pick<IntegrationGroup, 'members' | 'default'>
): string | undefined =>
  (group.members.find((m) => m.package === group.default) ?? group.members[0])?.schema;

/**
 * Distinct member schemas, default schema first, then in member order. Planned schemas aren't
 * included (they have no package).
 */
export const getGroupSchemas = (group: Pick<IntegrationGroup, 'members' | 'default'>): string[] => {
  const defaultSchema = getGroupDefaultSchema(group);
  const schemas = [...new Set(group.members.map((m) => m.schema))];
  return defaultSchema ? [defaultSchema, ...schemas.filter((s) => s !== defaultSchema)] : schemas;
};

const SCHEMA_LABELS: Record<string, string> = {
  ecs: 'ECS',
  otel: 'OTel',
  prometheus: 'Prometheus',
  ocsf: 'OCSF',
};

/** Short schema label ("OTel"), renamed by the group's `schema_labels` when it has one. */
export const getSchemaLabel = (schema: string, group?: Pick<IntegrationGroup, 'schema_labels'>) =>
  group?.schema_labels?.[schema] ?? SCHEMA_LABELS[schema] ?? schema.toUpperCase();
