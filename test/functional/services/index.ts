/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { services as commonServiceProviders } from '../../common/services';

import { AppsMenuService } from './apps_menu';
import {
  BrowserProvider,
  FailureDebuggingProvider,
  FindProvider,
  PngService,
  ScreenshotsService,
  SnapshotsService,
  TestSubjects,
  RetryOnStaleProvider,
} from './common';
import { ComboBoxService } from './combo_box';
import {
  DashboardAddPanelService,
  DashboardReplacePanelService,
  DashboardExpectService,
  DashboardPanelActionsService,
  DashboardVisualizationsService,
  DashboardDrilldownPanelActionsProvider,
  DashboardDrilldownsManageProvider,
} from './dashboard';
import { DocTableService } from './doc_table';
import { EmbeddingService } from './embedding';
import { FilterBarService } from './filter_bar';
import { FlyoutService } from './flyout';
import { GlobalNavService } from './global_nav';
import { InspectorService } from './inspector';
import { FieldEditorService } from './field_editor';
import { ManagementMenuService } from './management';
import { QueryBarService } from './query_bar';
import { RemoteProvider } from './remote';
import { RenderableService } from './renderable';
import { ToastsService } from './toasts';
import { DataGridService } from './data_grid';
import {
  PieChartService,
  ElasticChartService,
  VegaDebugInspectorViewService,
} from './visualizations';
import { ListingTableService } from './listing_table';
import { SavedQueryManagementComponentService } from './saved_query_management_component';
import { KibanaSupertestProvider } from './supertest';
import { MenuToggleService } from './menu_toggle';
import { MonacoEditorService } from './monaco_editor';
import { UsageCollectionService } from './usage_collection';

export const services = {
  ...commonServiceProviders,

  __webdriver__: RemoteProvider,
  filterBar: FilterBarService,
  queryBar: QueryBarService,
  find: FindProvider,
  testSubjects: TestSubjects,
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
  dashboardDrilldownPanelActions: DashboardDrilldownPanelActionsProvider,
  dashboardDrilldownsManage: DashboardDrilldownsManageProvider,
  flyout: FlyoutService,
  comboBox: ComboBoxService,
  dataGrid: DataGridService,
  embedding: EmbeddingService,
  renderable: RenderableService,
  browser: BrowserProvider,
  pieChart: PieChartService,
  inspector: InspectorService,
  fieldEditor: FieldEditorService,
  vegaDebugInspector: VegaDebugInspectorViewService,
  appsMenu: AppsMenuService,
  globalNav: GlobalNavService,
  toasts: ToastsService,
  savedQueryManagementComponent: SavedQueryManagementComponentService,
  elasticChart: ElasticChartService,
  supertest: KibanaSupertestProvider,
  managementMenu: ManagementMenuService,
  monacoEditor: MonacoEditorService,
  menuToggle: MenuToggleService,
  retryOnStale: RetryOnStaleProvider,
  usageCollection: UsageCollectionService,
};
