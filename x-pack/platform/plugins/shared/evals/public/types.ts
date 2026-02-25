/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';

export type EvalsPublicSetup = Record<string, never>;
export type EvalsPublicStart = Record<string, never>;

export interface EvalsSetupDependencies {
  data: DataPublicPluginSetup;
}

export interface EvalsStartDependencies {
  data: DataPublicPluginStart;
}
