/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: helpers for integration groups. Groups come from the package registry
// (`GET /groups`, exposed by Fleet as GET /internal/fleet/epm/groups); they are not packages.
// Each schema names a member package, with no version: the member resolves to the latest
// registry version compatible with the stack. The package policy always belongs to the member.
// Not to be confused with static groups (`INTEGRATION_GROUPS`, driven by the manifest `group`).

import type { IntegrationGroup } from '../types';

export interface GroupSchemaChild {
  schema: string;
  package: string;
}

export const GROUP_QUERYPARAM = 'group';

/** One entry per schema, in registry order. */
export const getGroupSchemaChildren = (
  group: Pick<IntegrationGroup, 'schemas'>
): GroupSchemaChild[] =>
  Object.entries(group.schemas ?? {}).flatMap(([schema, value]) =>
    value?.package ? [{ schema, package: value.package }] : []
  );

/** The schema marked `default: true`, falling back to the first schema if none is. */
export const getGroupDefaultSchema = (
  group: Pick<IntegrationGroup, 'schemas'>
): string | undefined => {
  const entries = Object.entries(group.schemas ?? {});
  return (entries.find(([, value]) => value?.default) ?? entries[0])?.[0];
};

/** Member package names of every group, e.g. to hide them from browse. */
export const getGroupMemberNames = (groups: IntegrationGroup[]): Set<string> =>
  new Set(groups.flatMap((g) => getGroupSchemaChildren(g).map((c) => c.package)));

const SCHEMA_LABELS: Record<string, string> = { ecs: 'ECS', otel: 'OTel' };
export const getSchemaLabel = (schema: string) => SCHEMA_LABELS[schema] ?? schema.toUpperCase();
