/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: helpers for "root" packages. A root is any package whose manifest has `schemas`.
// Roots carry no policy templates or assets; each schema points at a child integration
// package via `requires.integration`. The package policy always belongs to the child.

import type { PackageDependency, PackageSchemas } from '../types';

export interface RootSchemaChild {
  schema: string;
  package: string;
  version: string;
}

export const ROOT_QUERYPARAM = 'root';

export const isRootPackage = (pkg: { schemas?: PackageSchemas }): boolean => !!pkg.schemas;

export const getRootSchemaChildren = (pkg: { schemas?: PackageSchemas }): RootSchemaChild[] => {
  if (!pkg.schemas) return [];
  return Object.entries(pkg.schemas).flatMap(([schema, value]) => {
    if (schema === 'default' || typeof value === 'string') return [];
    const deps: PackageDependency[] = value?.requires?.integration ?? [];
    return deps.map((dep) => ({ schema, package: dep.package, version: dep.version }));
  });
};

export const getRootDefaultSchema = (pkg: { schemas?: PackageSchemas }): string | undefined =>
  pkg.schemas?.default;

const SCHEMA_LABELS: Record<string, string> = { ecs: 'ECS', otel: 'OTel' };
export const getSchemaLabel = (schema: string) => SCHEMA_LABELS[schema] ?? schema.toUpperCase();
