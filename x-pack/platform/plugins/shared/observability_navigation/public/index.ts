/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { Plugin } from './plugin';
import { ObservabilityNavigationPluginSetup, ObservabilityNavigationPluginStart } from './types';
import {
  ObservabilityDynamicNavigation,
  EnrichedEntityDefinitionsResponse,
  EntityDefinitionsResponse,
} from '../common/types';

export type {
  ObservabilityNavigationPluginSetup,
  ObservabilityNavigationPluginStart,
  ObservabilityDynamicNavigation,
  EnrichedEntityDefinitionsResponse,
  EntityDefinitionsResponse,
};

export const plugin: PluginInitializer<
  ObservabilityNavigationPluginSetup,
  ObservabilityNavigationPluginStart
> = (context: PluginInitializerContext) => {
  return new Plugin(context);
};
