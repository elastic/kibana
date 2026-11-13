/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensXYOverlayProvider } from '@kbn/lens-common';

export interface XYOverlayProviderRegistry {
  register: (provider: LensXYOverlayProvider) => void;
  get: (id: string) => LensXYOverlayProvider | undefined;
  getAll: () => readonly LensXYOverlayProvider[];
}

/** Creates the registry backing `LensPublicSetup.registerXYOverlayProvider`. */
export const createXYOverlayProviderRegistry = (): XYOverlayProviderRegistry => {
  const providers = new Map<string, LensXYOverlayProvider>();

  return {
    register: (provider) => {
      if (providers.has(provider.id)) {
        throw new Error(`Lens XY overlay provider "${provider.id}" is already registered`);
      }
      providers.set(provider.id, provider);
    },
    get: (id) => providers.get(id),
    getAll: () => [...providers.values()],
  };
};
