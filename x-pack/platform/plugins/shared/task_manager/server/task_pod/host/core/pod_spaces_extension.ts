/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsSpacesExtension } from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';

/**
 * The spaces extension of a pod: the plugin that owns spaces is not running, so the active space
 * is the one the run's fake request carries (`request.spaceId`). It resolves the namespace like
 * Kibana's own spaces extension, minus its spaces lookup: `namespaces` are used as given, and an
 * explicit `namespace` option is honoured instead of rejected (pod code, not users, calls it).
 */
export class PodSpacesExtension implements ISavedObjectsSpacesExtension {
  constructor(private readonly activeSpaceId: string) {}

  getCurrentNamespace(namespace: string | undefined) {
    return namespace ?? SavedObjectsUtils.namespaceStringToId(this.activeSpaceId);
  }

  async getSearchableNamespaces(namespaces: string[] | undefined) {
    return namespaces ?? [this.activeSpaceId];
  }

  asScopedToNamespace(namespace: string) {
    return new PodSpacesExtension(namespace);
  }
}
