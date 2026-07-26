/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

/**
 * Options for creating connector tools.
 * Uses a getter for lazy resolution — the actions start contract
 * is not available until after plugin start.
 */
export interface ConnectorToolsOptions {
  /** Lazy getter for the Actions plugin start contract (resolved at handler invocation time). */
  getActions: () => Promise<ActionsPluginStart>;
}
