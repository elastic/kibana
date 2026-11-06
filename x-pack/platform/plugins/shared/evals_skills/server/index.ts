/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type {
  EvalsSkillsSetupDependencies,
  EvalsSkillsStartDependencies,
  EvalsSkillsPluginSetup,
  EvalsSkillsPluginStart,
} from './types';

export const plugin: PluginInitializer<
  EvalsSkillsPluginSetup,
  EvalsSkillsPluginStart,
  EvalsSkillsSetupDependencies,
  EvalsSkillsStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  const { EvalsSkillsPlugin } = await import('./plugin');
  return new EvalsSkillsPlugin(pluginInitializerContext);
};
