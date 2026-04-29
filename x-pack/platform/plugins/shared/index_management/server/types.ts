/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { IndexDataEnricher } from './services';
import type { handleEsError } from './shared_imports';

export interface Dependencies {
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  config: {
    isSecurityEnabled: () => boolean;
    isLegacyTemplatesEnabled: boolean;
    isIndexStatsEnabled: boolean;
    isSizeAndDocCountEnabled: boolean;
    isDataStreamStatsEnabled: boolean;
    enableMappingsSourceFieldSection: boolean;
    enableTogglingDataRetention: boolean;
    enableProjectLevelRetentionChecks: boolean;
    enableFailureStoreRetentionDisabling: boolean;
  };
  indexDataEnricher: IndexDataEnricher;
  lib: {
    handleEsError: typeof handleEsError;
  };
}
