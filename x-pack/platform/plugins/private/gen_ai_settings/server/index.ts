/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { GenAiSettingsPlugin } from './plugin';
import { config } from '../common/config';

export function plugin(initializerContext: PluginInitializerContext) {
  return new GenAiSettingsPlugin(initializerContext);
}

export { config };

export type { GenAiSettingsPluginSetup, GenAiSettingsPluginStart } from './plugin';
export type { GenAiSettingsConfigType } from '../common/config';
export type { GenAiSettingsServerRouteRepository } from './routes/get_global_gen_ai_settings_route_repository';
