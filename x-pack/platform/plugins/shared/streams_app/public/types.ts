/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { AppMountParameters } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type {
  DiscoverSharedPublicSetup,
  DiscoverSharedPublicStart,
} from '@kbn/discover-shared-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { IndexManagementPluginStart } from '@kbn/index-management-shared-types';
import type { IngestPipelinesPluginStart } from '@kbn/ingest-pipelines-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { SharePublicSetup, SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/
export interface ConfigSchema {}

export interface StreamsApplicationProps {
  appMountParameters: AppMountParameters;
  PageTemplate: React.FC<React.PropsWithChildren<{}>>;
}

export type StreamsApplicationComponentType = React.FC<StreamsApplicationProps>;

export interface StreamsAppSetupDependencies {
  data: DataPublicPluginSetup;
  dataViews: DataViewsPublicPluginSetup;
  discover: DiscoverStart;
  discoverShared: DiscoverSharedPublicSetup;
  share: SharePublicSetup;
  unifiedSearch: {};
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
}

export interface StreamsAppStartDependencies {
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  discoverShared: DiscoverSharedPublicStart;
  fieldFormats: FieldFormatsStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  indexManagement: IndexManagementPluginStart;
  ingestPipelines: IngestPipelinesPluginStart;
  licensing: LicensingPluginStart;
  navigation: NavigationPublicStart;
  savedObjectsTagging: SavedObjectTaggingPluginStart;
  share: SharePublicStart;
  streams: StreamsPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  unifiedDocViewer: UnifiedDocViewerStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
}

export interface StreamsAppPublicSetup {}

export interface StreamsAppPublicStart {
  createStreamsApplicationComponent: () => StreamsApplicationComponentType;
}
