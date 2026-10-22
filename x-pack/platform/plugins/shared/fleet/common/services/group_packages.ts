/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: helpers for integration groups. An integration group is any package whose manifest
// has `schemas`. Groups carry no policy templates or assets; each schema names a child package
// (`schemas.<name>.package`), with no version: the child resolves to the latest registry version
// compatible with the stack. The package policy always belongs to the child.
// Not to be confused with static groups (`INTEGRATION_GROUPS`, driven by the manifest `group`).

import type { PackageSchemas } from '../types';

export interface GroupSchemaChild {
  schema: string;
  package: string;
}

export const GROUP_QUERYPARAM = 'group';

export const isGroupPackage = (pkg: { schemas?: PackageSchemas }): boolean => !!pkg.schemas;

/** One entry per schema, in manifest order. Skips schemas without a `package`. */
export const getGroupSchemaChildren = (pkg: { schemas?: PackageSchemas }): GroupSchemaChild[] =>
  Object.entries(pkg.schemas ?? {}).flatMap(([schema, value]) =>
    value?.package ? [{ schema, package: value.package }] : []
  );

/** The schema marked `default: true`, falling back to the first schema if none is. */
export const getGroupDefaultSchema = (pkg: { schemas?: PackageSchemas }): string | undefined => {
  if (!pkg.schemas) return undefined;
  const entries = Object.entries(pkg.schemas);
  return (entries.find(([, value]) => value?.default) ?? entries[0])?.[0];
};

const SCHEMA_LABELS: Record<string, string> = { ecs: 'ECS', otel: 'OTel' };
export const getSchemaLabel = (schema: string) => SCHEMA_LABELS[schema] ?? schema.toUpperCase();
