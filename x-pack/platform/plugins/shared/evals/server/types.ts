/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';

export type EvalsPluginSetup = Record<string, never>;
export type EvalsPluginStart = Record<string, never>;

export interface EvalsSetupDependencies {
  features: FeaturesPluginSetup;
  data: DataPluginSetup;
}

export interface EvalsStartDependencies {
  data: DataPluginStart;
}
