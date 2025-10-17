/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { ReindexServicePublicStart } from '@kbn/reindex-service-plugin/public';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { BreadcrumbService } from './application/lib/breadcrumbs';
import type { ApiService } from './application/lib/api';
import type { FeatureSet } from '../common/types';

export interface KibanaVersionContext {
  currentMajor: number;
  prevMajor: number;
  nextMajor: number;
  currentMinor: number;
  currentPatch: number;
}

export interface SetupDependencies {
  management: ManagementSetup;
  share: SharePluginSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface StartDependencies {
  licensing: LicensingPluginStart;
  data: DataPublicPluginStart;
  reindexService: ReindexServicePublicStart;
}

export interface ClientConfigType {
  featureSet: FeatureSet;
  ui: {
    enabled: boolean;
  };
}

export interface AppDependencies {
  kibanaVersionInfo: KibanaVersionContext;
  featureSet: FeatureSet;
  plugins: {
    cloud?: CloudSetup;
    share: SharePluginSetup;
    reindexService: ReindexServicePublicStart;
  };
  services: {
    core: CoreStart;
    data: DataPublicPluginStart;
    history: ScopedHistory;
  };
}

export interface RootComponentDependencies extends AppDependencies {
  services: {
    core: CoreStart;
    data: DataPublicPluginStart;
    breadcrumbs: BreadcrumbService;
    history: ScopedHistory;
    api: ApiService;
  };
}
