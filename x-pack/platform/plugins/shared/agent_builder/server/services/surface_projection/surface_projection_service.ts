/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createSurfaceProjectorRegistry,
  type SurfaceProjectorRegistry,
} from './surface_projector_registry';
import type { SurfaceProjectionServiceSetup, SurfaceProjectionServiceStart } from './types';

export interface SurfaceProjectionService {
  setup: () => SurfaceProjectionServiceSetup;
  start: () => SurfaceProjectionServiceStart;
}

export const createSurfaceProjectionService = (): SurfaceProjectionService => {
  return new SurfaceProjectionServiceImpl();
};

export class SurfaceProjectionServiceImpl implements SurfaceProjectionService {
  readonly registry: SurfaceProjectorRegistry;

  constructor() {
    this.registry = createSurfaceProjectorRegistry();
  }

  setup(): SurfaceProjectionServiceSetup {
    return {
      register: (projector) => this.registry.register(projector),
    };
  }

  start(): SurfaceProjectionServiceStart {
    return {
      getProjector: (surface) => this.registry.get(surface),
    };
  }
}
