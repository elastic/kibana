/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';

/**
 * Options for creating CE tools.
 * Uses a getter for lazy resolution — the start contract is not available until after plugin start.
 */
export interface CeToolsOptions {
  getContextEngine: () => ContextEnginePluginStart;
}
