/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import type { AdaptiveUiConfig } from '../common/config';
import { AdaptiveUiPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext<AdaptiveUiConfig>) {
  return new AdaptiveUiPlugin(initializerContext);
}

export type { AdaptiveUiPluginSetup, AdaptiveUiPluginStart } from './types';
