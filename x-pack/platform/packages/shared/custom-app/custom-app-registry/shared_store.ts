/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { CapabilityManifest } from './define_capability';
import type { DocumentResolver } from './document_resolver';

export type AnyCapability = CapabilityManifest<string, z.ZodRawShape>;

/** Loads the code that draws a capability. Only the browser has any. */
export type CapabilityViewLoader = () => Promise<{ default: unknown }>;

interface Store {
  capabilities: Map<string, AnyCapability>;
  views: Map<string, CapabilityViewLoader>;
  documentResolvers: DocumentResolver[];
}

/**
 * Where what is registered is kept. A package is bundled again into each plugin that uses it, so a
 * module level value would be one for each plugin and the registrations of one would not be seen by
 * another. The global symbol registry is the same for all of them, which is how the tokens of
 * Kibana's own dependency injection stay the same across plugins.
 */
const STORE_KEY = Symbol.for('@kbn/custom-app-registry/store');

export const getStore = (): Store => {
  const holder = globalThis as unknown as Record<symbol, Store | undefined>;
  const existing = holder[STORE_KEY];
  if (existing) return existing;
  const created: Store = { capabilities: new Map(), views: new Map(), documentResolvers: [] };
  holder[STORE_KEY] = created;
  return created;
};
