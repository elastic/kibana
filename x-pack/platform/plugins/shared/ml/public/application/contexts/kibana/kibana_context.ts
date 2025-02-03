/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { useKibana, type KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { DataVisualizerPluginStart } from '@kbn/data-visualizer-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { MlServicesContext } from '../../app';

interface StartPlugins {
  cases?: CasesPublicStart;
  charts: ChartsPluginStart;
  contentManagement: ContentManagementPublicStart;
  dashboard: DashboardStart;
  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dataViews: DataViewsPublicPluginStart;
  dataVisualizer?: DataVisualizerPluginStart;
  embeddable: EmbeddableStart;
  fieldFormats: FieldFormatsRegistry;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  licenseManagement?: LicenseManagementUIPluginSetup;
  maps?: MapsStartApi;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  presentationUtil: PresentationUtilPluginStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedSearch: SavedSearchPublicPluginStart;
  security?: SecurityPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi?: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection?: UsageCollectionSetup;
}
export type StartServices = CoreStart &
  StartPlugins & {
    kibanaVersion: string;
    storage: IStorageWrapper;
  } & MlServicesContext;
export const useMlKibana = () => useKibana<StartServices>();
export type MlKibanaReactContextValue = KibanaReactContextValue<StartServices>;
