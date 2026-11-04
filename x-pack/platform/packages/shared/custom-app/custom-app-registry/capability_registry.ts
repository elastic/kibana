/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { CapabilityManifest } from './define_capability';

export type AnyCapability = CapabilityManifest<string, z.ZodRawShape>;

const capabilities = new Map<string, AnyCapability>();

/** Adds a capability. An id can be registered once. */
export const registerCapability = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>
): void => {
  const known = capabilities.get(manifest.id);
  if (known === (manifest as unknown as AnyCapability)) return;
  if (known) throw new Error(`The capability "${manifest.id}" is registered already`);
  capabilities.set(manifest.id, manifest as unknown as AnyCapability);
};

export const getCapability = (id: string): AnyCapability | undefined => capabilities.get(id);

export const listCapabilities = (): readonly AnyCapability[] => Array.from(capabilities.values());
