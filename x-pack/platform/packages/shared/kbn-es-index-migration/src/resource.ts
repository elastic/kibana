/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_NAMESPACE } from './types';
import type { MigrationResource } from './types';

export const isGlobal = (resource: MigrationResource): boolean => resource.scope === 'global';

/** Resolves the concrete name, ignoring the namespace for a global resource. */
export const resolveName = (resource: MigrationResource, namespace: string): string =>
  resource.scope === 'global' ? resource.name() : resource.name(namespace);

/**
 * The namespaces a migration should actually be reconciled for.
 *
 * A global resource collapses to a single pass whatever the space count, so the work and
 * everything derived from it - status entries, metrics, task state - counts it once.
 */
export const namespacesFor = (resource: MigrationResource, namespaces: string[]): string[] =>
  isGlobal(resource) ? [GLOBAL_NAMESPACE] : namespaces;
