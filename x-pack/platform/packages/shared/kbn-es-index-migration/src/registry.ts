/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationDefinition, MigrationRegistry } from './types';

/**
 * Holds the migrations a plugin has declared.
 *
 * Registration exists so that `id` means something beyond a log label: it is the key
 * that status, metrics and logs are all reported under, so two definitions sharing one
 * would silently merge in every one of them. Rejecting a duplicate at registration
 * turns that into a startup failure instead.
 *
 * Scoped to the plugin that creates it. A registry spanning plugins - which is what an
 * unattended runner and a Kibana-wide status view would both need - requires a lifecycle
 * a package does not have.
 */
export const createMigrationRegistry = (): MigrationRegistry => {
  const definitions = new Map<string, MigrationDefinition>();

  return {
    register(definition: MigrationDefinition): void {
      const existing = definitions.get(definition.id);

      if (existing !== undefined) {
        // Re-registering the identical object is a double import, not a collision.
        if (existing === definition) {
          return;
        }
        throw new Error(
          `es-index-migration: a different migration is already registered as "${definition.id}". ` +
            `Ids must be unique - they key status, metrics and logs.`
        );
      }

      definitions.set(definition.id, definition);
    },

    get(id: string): MigrationDefinition | undefined {
      return definitions.get(id);
    },

    has(id: string): boolean {
      return definitions.has(id);
    },

    all(): MigrationDefinition[] {
      return [...definitions.values()];
    },

    get size(): number {
      return definitions.size;
    },
  };
};
