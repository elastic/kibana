/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolverTypeDefinition } from '@kbn/agent-builder-server';
import type { AgentContextLayerPluginStart } from '@kbn/agent-context-layer-plugin/server';

/**
 * Narrow resolver registry for {@link createSmlReadTool} — `format` / `getBoundedTools`
 * without coupling to attachment persistence or the full tool handler context.
 */
export interface SmlReadResolverService {
  getResolverType(typeId: string): ResolverTypeDefinition | undefined;
}

/**
 * Options for creating SML tools.
 * Uses getters for lazy resolution — the agent context layer start contract
 * is not available until after plugin start.
 */
export interface SmlToolsOptions {
  getAgentContextLayer: () => AgentContextLayerPluginStart;
  /**
   * Resolver types backing SML attachment payloads (same registry as conversation attachments).
   * Injected so only `sml_read` depends on it; other SML tools ignore this field.
   */
  getSmlReadResolverService: () => SmlReadResolverService;
}
