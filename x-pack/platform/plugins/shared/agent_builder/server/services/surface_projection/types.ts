/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationOriginType } from '@kbn/agent-builder-common';
import type { SurfaceProjectorDefinition } from '@kbn/agent-builder-server';

export interface SurfaceProjectionServiceSetup {
  register(projector: SurfaceProjectorDefinition): void;
}

export interface SurfaceProjectionServiceStart {
  getProjector(surface: ConversationOriginType): SurfaceProjectorDefinition | undefined;
}
