/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToastsStart } from '@kbn/core/public';
import {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';

import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { SloPlugin } from './plugin';

export interface SloPublicPluginsSetup {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  licensing: LicensingPluginSetup;
  share: SharePluginSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
  serverless?: ServerlessPluginSetup;
  presentationUtil?: PresentationUtilPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
  usageCollection: UsageCollectionSetup;
}

export interface SloPublicPluginsStart {
  actionTypeRegistry: ActionTypeRegistryContract;
  cases: CasesPublicStart;
  cloud?: CloudStart;
  dataViewEditor: DataViewEditorStart;
  fieldFormats: FieldFormatsStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  security: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  share: SharePluginStart;
  licensing: LicensingPluginStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  presentationUtil: PresentationUtilPluginStart;
  serverless?: ServerlessPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  lens: LensPublicStart;
  charts: ChartsPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  uiSettings: IUiSettingsClient;
  usageCollection: UsageCollectionStart;
  discover: DiscoverStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
  toastNotifications: ToastsStart;
}

export type SloPublicSetup = ReturnType<SloPlugin['setup']>;
export type SloPublicStart = ReturnType<SloPlugin['start']>;
