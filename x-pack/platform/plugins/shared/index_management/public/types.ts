/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceStart,
  I18nStart,
  OverlayStart,
  ThemeServiceStart,
  UserProfileService,
} from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { MlPluginStart } from '@kbn/ml-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type {
  ReindexServicePublicSetup,
  ReindexServicePublicStart,
} from '@kbn/reindex-service-plugin/public';

export interface IndexManagementStartServices {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  overlays: OverlayStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
  userProfile: UserProfileService;
}

export interface SetupDependencies {
  fleet?: unknown;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
  cloud?: CloudSetup;
  reindexService: ReindexServicePublicSetup;
}

export interface StartDependencies {
  cloud?: CloudSetup;
  console?: ConsolePluginStart;
  share: SharePluginStart;
  fleet?: unknown;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  licensing?: LicensingPluginStart;
  ml?: MlPluginStart;
  streams?: StreamsPluginStart;
  reindexService: ReindexServicePublicStart;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
  enableIndexActions?: boolean;
  enableLegacyTemplates?: boolean;
  enableIndexStats?: boolean;
  enableSizeAndDocCount?: boolean;
  enableDataStreamStats?: boolean;
  editableIndexSettings?: 'all' | 'limited';
  enableMappingsSourceFieldSection?: boolean;
  enableTogglingDataRetention?: boolean;
  enableProjectLevelRetentionChecks?: boolean;
  enableFailureStoreRetentionDisabling?: boolean;
  dev: {
    enableSemanticText?: boolean;
  };
}
