/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityDefinitionRegistry,
  RegisteredEntityDefinition,
} from './entity_definition_registry';

/**
 * Read access to entity definitions for one space. Methods are async so stored definitions can be
 * added later without changing callers; today they only read the in-memory registry.
 */
export interface EntityDefinitionsClient {
  /** The space the client was created for. Not used yet; reserved for per-space definitions. */
  readonly namespace: string;
  get(type: string): Promise<RegisteredEntityDefinition | undefined>;
  list(): Promise<RegisteredEntityDefinition[]>;
  listMaterialized(): Promise<RegisteredEntityDefinition[]>;
}

/** Creates an `EntityDefinitionsClient` backed by the given registry. */
export const createEntityDefinitionsClient = (
  registry: EntityDefinitionRegistry,
  namespace: string
): EntityDefinitionsClient => ({
  namespace,
  get: async (type) => registry.get(type),
  list: async () => registry.list(),
  listMaterialized: async () => registry.listMaterialized(),
});
