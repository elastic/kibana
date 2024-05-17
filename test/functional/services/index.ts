/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { commonFunctionalUIServices } from '@kbn/ftr-common-functional-ui-services';
import { services as commonServiceProviders } from '../../common/services';

import { AppsMenuService } from './apps_menu';
import { ComboBoxService } from './combo_box';
import {
  FailureDebuggingProvider,
  PngService,
  ScreenshotsService,
  SnapshotsService,
} from './common';
import {
  DashboardAddPanelService,
  DashboardBadgeActionsProvider,
  DashboardCustomizePanelProvider,
  DashboardDrilldownPanelActionsProvider,
  DashboardDrilldownsManageProvider,
  DashboardExpectService,
  DashboardPanelActionsService,
  DashboardReplacePanelService,
  DashboardVisualizationsService,
} from './dashboard';
import { DashboardSettingsProvider } from './dashboard/dashboard_settings';
import { DataGridService } from './data_grid';
import { DataViewsService } from './data_views';
import { DocTableService } from './doc_table';
import { EmbeddingService } from './embedding';
import { ESQLService } from './esql';
import { FieldEditorService } from './field_editor';
import { FilterBarService } from './filter_bar';
import { FlyoutService } from './flyout';
import { GlobalNavService } from './global_nav';
import { InspectorService } from './inspector';
import { ListingTableService } from './listing_table';
import { ManagementMenuService } from './management';
import { MenuToggleService } from './menu_toggle';
import { MonacoEditorService } from './monaco_editor';
import { QueryBarService } from './query_bar';
import { RenderableService } from './renderable';
import { SavedObjectsFinderService } from './saved_objects_finder';
import { SavedQueryManagementComponentService } from './saved_query_management_component';
import { SelectableService } from './selectable';
import { KibanaSupertestProvider } from './supertest';
import { UsageCollectionService } from './usage_collection';
import {
  ElasticChartService,
  PieChartService,
  VegaDebugInspectorViewService,
} from './visualizations';

export const services = {
  ...commonServiceProviders,
  ...commonFunctionalUIServices,
  filterBar: FilterBarService,
  queryBar: QueryBarService,
  docTable: DocTableService,
  png: PngService,
  screenshots: ScreenshotsService,
  snapshots: SnapshotsService,
  failureDebugging: FailureDebuggingProvider,
  listingTable: ListingTableService,
  dashboardVisualizations: DashboardVisualizationsService,
  dashboardExpect: DashboardExpectService,
  dashboardAddPanel: DashboardAddPanelService,
  dashboardReplacePanel: DashboardReplacePanelService,
  dashboardPanelActions: DashboardPanelActionsService,
  dashboardCustomizePanel: DashboardCustomizePanelProvider,
  dashboardBadgeActions: DashboardBadgeActionsProvider,
  dashboardDrilldownPanelActions: DashboardDrilldownPanelActionsProvider,
  dashboardDrilldownsManage: DashboardDrilldownsManageProvider,
  dashboardSettings: DashboardSettingsProvider,
  dataViews: DataViewsService,
  flyout: FlyoutService,
  comboBox: ComboBoxService,
  selectable: SelectableService,
  dataGrid: DataGridService,
  embedding: EmbeddingService,
  renderable: RenderableService,
  pieChart: PieChartService,
  inspector: InspectorService,
  fieldEditor: FieldEditorService,
  vegaDebugInspector: VegaDebugInspectorViewService,
  appsMenu: AppsMenuService,
  globalNav: GlobalNavService,
  savedQueryManagementComponent: SavedQueryManagementComponentService,
  elasticChart: ElasticChartService,
  supertest: KibanaSupertestProvider,
  managementMenu: ManagementMenuService,
  monacoEditor: MonacoEditorService,
  menuToggle: MenuToggleService,
  usageCollection: UsageCollectionService,
  savedObjectsFinder: SavedObjectsFinderService,
  esql: ESQLService,
};
