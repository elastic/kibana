/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { AlertingPublicPlugin } from './plugin';
export type { PluginSetupContract, PluginStartContract } from './plugin';
export type { AlertNavigationHandler } from './alert_navigation_registry';

export function plugin(initializerContext: PluginInitializerContext) {
  return new AlertingPublicPlugin(initializerContext);
}
