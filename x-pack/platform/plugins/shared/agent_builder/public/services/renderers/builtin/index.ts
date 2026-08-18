/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderersService } from '../renderers_service';
import { fileContentRendererUIDefinition } from './file_content_renderer';

/**
 * Registers all built-in (agent-builder-owned) renderer UI definitions with the
 * shared renderer service. Called from the plugin's `start` lifecycle.
 */
export const registerBuiltinRenderers = ({
  renderersService,
}: {
  renderersService: RenderersService;
}): void => {
  renderersService.register(fileContentRendererUIDefinition);
};
