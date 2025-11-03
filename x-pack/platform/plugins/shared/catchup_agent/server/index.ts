/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Module-level log to verify file is loaded
// eslint-disable-next-line no-console
console.log('[CATCHUP-AGENT] server/index.ts module loaded');

import type { PluginInitializerContext } from '@kbn/core/server';
import { CatchupAgentPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  // eslint-disable-next-line no-console
  console.log('[CATCHUP-AGENT] plugin() function called');
  const logger = initializerContext.logger.get('catchup-agent');
  logger.info('CatchupAgent plugin entry point called - plugin function invoked');
  const pluginInstance = new CatchupAgentPlugin(initializerContext);
  // eslint-disable-next-line no-console
  console.log('[CATCHUP-AGENT] plugin instance created');
  return pluginInstance;
}

export type { CatchupAgentPluginSetup, CatchupAgentPluginStart } from './types';
