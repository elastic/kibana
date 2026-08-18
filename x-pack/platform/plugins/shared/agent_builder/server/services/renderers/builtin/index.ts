/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RendererServiceSetup } from '../types';
import { fileContentRendererDefinition } from './file_content';

/**
 * Registers all built-in (agent-builder-owned) renderer type definitions with
 * the shared renderer registry. Called from the plugin's `setup` lifecycle.
 */
export const registerBuiltinRenderers = ({
  renderers,
}: {
  renderers: RendererServiceSetup;
}): void => {
  renderers.register(fileContentRendererDefinition);
};
