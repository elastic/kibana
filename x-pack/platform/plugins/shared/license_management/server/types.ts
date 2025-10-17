/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, IRouter } from '@kbn/core/server';

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { handleEsError } from './shared_imports';

export interface SetupDependencies {
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
}

export interface StartDependencies {
  licensing: LicensingPluginStart;
}

export interface RouteDependencies {
  router: IRouter;
  plugins: {
    licensing: LicensingPluginStart;
  };
  lib: {
    handleEsError: typeof handleEsError;
  };
  config: {
    isSecurityEnabled: boolean;
  };
}

export type CallAsCurrentUser = IScopedClusterClient['asCurrentUser'];

export type CallAsInternalUser = IScopedClusterClient['asInternalUser'];
