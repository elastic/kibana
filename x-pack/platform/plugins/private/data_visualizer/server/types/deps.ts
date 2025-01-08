/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';

export interface StartDeps {
  security?: SecurityPluginStart;
  data: DataPluginStart;
}
export interface SetupDeps {
  usageCollection: UsageCollectionSetup;
  customIntegrations?: CustomIntegrationsPluginSetup;
  home?: HomeServerPluginSetup;
  data: DataPluginSetup;
}
