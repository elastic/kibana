/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import { DataStreamsStatsClient } from '@kbn/dataset-quality-plugin/public/services/data_streams_stats/data_streams_stats_client';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { StreamsAppKibanaContext } from '../public/hooks/use_kibana';
import { StreamsTelemetryService } from '../public/telemetry/service';

export function getMockStreamsAppContext(): StreamsAppKibanaContext {
  const appParams = coreMock.createAppMountParameters();
  const core = coreMock.createStart();
  const coreSetup = coreMock.createSetup();

  const telemetryService = new StreamsTelemetryService();
  telemetryService.setup(coreSetup.analytics);

  return {
    appParams,
    core,
    dependencies: {
      start: {
        dataViews: {} as unknown as DataViewsPublicPluginStart,
        data: {} as unknown as DataPublicPluginStart,
        unifiedSearch: {} as unknown as UnifiedSearchPublicPluginStart,
        streams: {} as unknown as StreamsPluginStart,
        share: {} as unknown as SharePublicStart,
        navigation: {} as unknown as NavigationPublicStart,
        savedObjectsTagging: {} as unknown as SavedObjectTaggingPluginStart,
        fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
        licensing: {} as unknown as LicensingPluginStart,
        discoverShared: {} as unknown as DiscoverSharedPublicStart,
      },
    },
    services: {
      dataStreamsClient: Promise.resolve({} as unknown as DataStreamsStatsClient),
      PageTemplate: () => null,
      telemetryClient: telemetryService.getClient(),
    },
    isServerless: false,
  };
}
