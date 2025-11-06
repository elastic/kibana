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
import type { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { SharePublicSetup, SharePublicStart } from '@kbn/share-plugin/public/plugin';

/* eslint-disable @typescript-eslint/no-empty-interface*/
export interface ConfigSchema {}

export interface ScratchpadApplicationProps {
  appMountParameters: AppMountParameters;
}

export type ScratchpadApplicationComponentType = React.FC<ScratchpadApplicationProps>;

export interface ScratchpadAppSetupDependencies {
  data: DataPublicPluginSetup;
  dataViews: DataViewsPublicPluginSetup;
  share: SharePublicSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
}

export interface ScratchpadAppStartDependencies {
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  navigation: NavigationPublicStart;
  share: SharePublicStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
}

export interface ScratchpadAppPublicSetup {}

export interface ScratchpadAppPublicStart {}
