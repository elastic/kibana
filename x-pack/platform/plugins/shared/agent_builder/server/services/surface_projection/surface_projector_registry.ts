/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationOriginType } from '@kbn/agent-builder-common';
import type { SurfaceProjectorDefinition } from '@kbn/agent-builder-server';

export interface SurfaceProjectorRegistry {
  register(projector: SurfaceProjectorDefinition): void;
  has(surface: ConversationOriginType): boolean;
  get(surface: ConversationOriginType): SurfaceProjectorDefinition | undefined;
  list(): SurfaceProjectorDefinition[];
}

export const createSurfaceProjectorRegistry = (): SurfaceProjectorRegistry => {
  return new SurfaceProjectorRegistryImpl();
};

class SurfaceProjectorRegistryImpl implements SurfaceProjectorRegistry {
  private projectors: Map<ConversationOriginType, SurfaceProjectorDefinition> = new Map();

  register(projector: SurfaceProjectorDefinition) {
    if (this.projectors.has(projector.surface)) {
      throw new Error(`Surface projector for surface "${projector.surface}" already registered`);
    }
    this.projectors.set(projector.surface, projector);
  }

  has(surface: ConversationOriginType): boolean {
    return this.projectors.has(surface);
  }

  get(surface: ConversationOriginType) {
    return this.projectors.get(surface);
  }

  list() {
    return [...this.projectors.values()];
  }
}
