/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, SavedObjectsServiceStart } from '@kbn/core/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type SemVer from 'semver/classes/semver';
import type { Version } from '@kbn/upgrade-assistant-pkg-common';
import type { handleEsError } from './shared_imports';
import type { DataSourceExclusions, FeatureSet } from '../common/types';

export interface RouteDependencies {
  router: IRouter;
  log: Logger;
  getSavedObjectsService: () => SavedObjectsServiceStart;
  getSecurityPlugin: () => SecurityPluginStart | undefined;
  licensing: LicensingPluginSetup;
  lib: {
    handleEsError: typeof handleEsError;
  };
  config: {
    dataSourceExclusions: DataSourceExclusions;
    featureSet: FeatureSet;
    isSecurityEnabled: () => boolean;
  };
  current: SemVer;
  defaultTarget: number;
  version: Version;
  cleanupReindexOperations: (indexNames: string[]) => Promise<void>;
}
