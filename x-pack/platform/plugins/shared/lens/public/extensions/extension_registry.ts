/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensExtension } from '@kbn/lens-common';

export interface LensExtensionRegistry {
  register: (extension: LensExtension) => void;
  get: (id: string) => LensExtension | undefined;
  getAll: () => readonly LensExtension[];
}

/** Creates the registry backing `LensPublicSetup.registerExtension`. */
export const createLensExtensionRegistry = (): LensExtensionRegistry => {
  const extensions = new Map<string, LensExtension>();

  return {
    register: (extension) => {
      if (extensions.has(extension.id)) {
        throw new Error(`Lens extension "${extension.id}" is already registered`);
      }
      extensions.set(extension.id, extension);
    },
    get: (id) => extensions.get(id),
    getAll: () => [...extensions.values()],
  };
};
