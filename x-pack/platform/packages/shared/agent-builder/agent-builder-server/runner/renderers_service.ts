/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RendererTypeDefinition } from '../renderers';

/**
 * Renderer service exposed on the agent handler context, giving agent
 * execution read access to the renderer types registered in agentBuilder.
 */
export interface RenderersService {
  getRegisteredRenderers(): RendererTypeDefinition[];
  getRenderer(type: string): RendererTypeDefinition | undefined;
}
