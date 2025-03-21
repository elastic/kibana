/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { StreamsPluginSetup, StreamsPluginStart } from '@kbn/streams-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { SharePublicSetup, SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';
import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { AppMountParameters } from '@kbn/core/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import {
  DiscoverSharedPublicSetup,
  DiscoverSharedPublicStart,
} from '@kbn/discover-shared-plugin/public';
/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface StreamsApplicationProps {
  appMountParameters: AppMountParameters;
  PageTemplate: React.FC<React.PropsWithChildren<{}>>;
}

export type StreamsApplicationComponentType = React.FC<StreamsApplicationProps>;

export interface StreamsAppSetupDependencies {
  streams: StreamsPluginSetup;
  data: DataPublicPluginSetup;
  dataViews: DataViewsPublicPluginSetup;
  discoverShared: DiscoverSharedPublicSetup;
  unifiedSearch: {};
  share: SharePublicSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
}

export interface StreamsAppStartDependencies {
  streams: StreamsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  share: SharePublicStart;
  savedObjectsTagging: SavedObjectTaggingPluginStart;
  navigation: NavigationPublicStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  discoverShared: DiscoverSharedPublicStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  licensing: LicensingPluginStart;
}

export interface StreamsAppPublicSetup {}

export interface StreamsAppPublicStart {
  createStreamsApplicationComponent: () => StreamsApplicationComponentType;
}
