/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginStart {}

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineStartDependencies {}
