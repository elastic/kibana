/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { CapabilityManifest } from './define_capability';
import { getStore, type AnyCapability, type CapabilityViewLoader } from './shared_store';
import type { DocumentResolver } from './document_resolver';

export type { AnyCapability, CapabilityViewLoader };

/**
 * Adds a capability. An id can be registered once. The browser also says how to draw it; the
 * server only needs the manifest.
 */
export const registerCapability = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>,
  view?: CapabilityViewLoader
): void => {
  const { capabilities, views } = getStore();
  const known = capabilities.get(manifest.id);
  if (known && known !== (manifest as unknown as AnyCapability)) {
    throw new Error(`The capability "${manifest.id}" is registered already`);
  }
  capabilities.set(manifest.id, manifest as unknown as AnyCapability);
  if (view) views.set(manifest.id, view);
};

export const getCapability = (id: string): AnyCapability | undefined =>
  getStore().capabilities.get(id);

export const listCapabilities = (): readonly AnyCapability[] =>
  Array.from(getStore().capabilities.values());

/** How to draw a capability that was registered with a view. */
export const getCapabilityViewLoader = (id: string): CapabilityViewLoader | undefined =>
  getStore().views.get(id);

/** Adds a step that finishes the document an agent wrote, before it is checked and kept. */
export const registerDocumentResolver = <Context>(resolver: DocumentResolver<Context>): void => {
  const { documentResolvers } = getStore();
  if (!documentResolvers.includes(resolver as DocumentResolver)) {
    documentResolvers.push(resolver as DocumentResolver);
  }
};

export const listDocumentResolvers = (): readonly DocumentResolver<never>[] =>
  getStore().documentResolvers;
