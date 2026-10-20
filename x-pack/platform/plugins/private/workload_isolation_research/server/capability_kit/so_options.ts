/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-operation ALLOWLIST of SO option keys a space-pinned capability may pass. Anything that can
 * select or widen spaces (namespace, namespaces, initialNamespaces incl. '*', typeToNamespacesMap,
 * spaceId) or change ownership (accessControl) is absent, so it fails closed, as do unknown keys.
 */
const SO_OPTION_ALLOWLIST: Readonly<Record<string, ReadonlySet<string>>> = {
  get: new Set(['migrationVersionCompatibility']),
  resolve: new Set(['migrationVersionCompatibility']),
  bulkGet: new Set(['migrationVersionCompatibility']),
  create: new Set([
    'id',
    'overwrite',
    'version',
    'migrationVersion',
    'coreMigrationVersion',
    'typeMigrationVersion',
    'references',
    'refresh',
    'originId',
    'managed',
    'migrationVersionCompatibility',
  ]),
  update: new Set([
    'version',
    'references',
    'refresh',
    'upsert',
    'retryOnConflict',
    'migrationVersionCompatibility',
    'mergeAttributes',
  ]),
  delete: new Set(['refresh', 'force']),
  find: new Set([
    'type',
    'page',
    'perPage',
    'sortField',
    'sortOrder',
    'sort',
    'fields',
    'search',
    'searchFields',
    'searchAfter',
    'rootSearchFields',
    'hasReference',
    'hasReferenceOperator',
    'hasNoReference',
    'hasNoReferenceOperator',
    'defaultSearchOperator',
    'filter',
    'aggs',
    'preference',
    'pit',
    'migrationVersionCompatibility',
  ]),
};

/** Returns the options unchanged if every key is permitted for the operation; otherwise throws. */
export const allowlistedSoOptions = <T extends object>(operation: string, options: T): T => {
  const allowed = SO_OPTION_ALLOWLIST[operation];
  if (!allowed) throw new Error('SO operation not allowlisted');
  const denied = Object.keys(options).filter((key) => !allowed.has(key));
  if (denied.length)
    throw new Error(
      'SO option(s) not permitted for a space-pinned capability: ' + denied.join(', ')
    );
  return options;
};
