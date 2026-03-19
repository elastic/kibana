/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type {
  AlertingAgentBuilderPluginSetup,
  AlertingAgentBuilderPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';
import { AlertingAgentBuilderPlugin } from './plugin';

export type { AlertingAgentBuilderPluginSetup, AlertingAgentBuilderPluginStart };

export const plugin: PluginInitializer<
  AlertingAgentBuilderPluginSetup,
  AlertingAgentBuilderPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies
> = (_context: PluginInitializerContext) => new AlertingAgentBuilderPlugin();
