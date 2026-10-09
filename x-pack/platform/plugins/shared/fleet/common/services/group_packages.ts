/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: helpers for integration groups. An integration group is any package whose manifest
// has `schemas`. Groups carry no policy templates or assets; each schema names a child
// integration (`schemas.<name>.integration`) whose version range comes from the group's
// top-level `requires.integration`. The package policy always belongs to the child.
// Not to be confused with static groups (`INTEGRATION_GROUPS`, driven by the manifest `group`).

import type { PackageRequires, PackageSchemas } from '../types';

interface GroupManifestLike {
  schemas?: PackageSchemas;
  requires?: PackageRequires;
}

export interface GroupSchemaChild {
  schema: string;
  package: string;
  version: string;
}

export const GROUP_QUERYPARAM = 'group';

export const isGroupPackage = (pkg: { schemas?: PackageSchemas }): boolean => !!pkg.schemas;

/** One entry per schema, in manifest order. Skips schemas whose child isn't in `requires.integration`. */
export const getGroupSchemaChildren = (pkg: GroupManifestLike): GroupSchemaChild[] => {
  if (!pkg.schemas) return [];
  const deps = pkg.requires?.integration ?? [];
  return Object.entries(pkg.schemas).flatMap(([schema, value]) => {
    const dep = deps.find((d) => d.package === value?.integration);
    return dep ? [{ schema, package: dep.package, version: dep.version }] : [];
  });
};

/** The schema marked `default: true`, falling back to the first schema if none is. */
export const getGroupDefaultSchema = (pkg: { schemas?: PackageSchemas }): string | undefined => {
  if (!pkg.schemas) return undefined;
  const entries = Object.entries(pkg.schemas);
  return (entries.find(([, value]) => value?.default) ?? entries[0])?.[0];
};

const SCHEMA_LABELS: Record<string, string> = { ecs: 'ECS', otel: 'OTel' };
export const getSchemaLabel = (schema: string) => SCHEMA_LABELS[schema] ?? schema.toUpperCase();
