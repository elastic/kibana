/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentContextLayerPluginStart } from '@kbn/agent-context-layer-plugin/server';

/**
 * Options for creating SML tools.
 * Uses a getter for lazy resolution — the start contract is not available until after plugin start.
 */
export interface SmlToolsOptions {
  getAgentContextLayer: () => AgentContextLayerPluginStart;
}
