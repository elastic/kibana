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
  ScreenshotsService,
  SnapshotsService,
  TestSubjects,
} from './common';
import { ComboBoxService } from './combo_box';
import {
  DashboardAddPanelService,
  DashboardReplacePanelService,
  DashboardExpectService,
  DashboardPanelActionsService,
  DashboardVisualizationsService,
} from './dashboard';
import { DocTableService } from './doc_table';
import { EmbeddingProvider } from './embedding';
import { FilterBarService } from './filter_bar';
import { FlyoutService } from './flyout';
import { GlobalNavService } from './global_nav';
import { InspectorService } from './inspector';
import { FieldEditorService } from './field_editor';
import { ManagementMenuService } from './management';
import { QueryBarProvider } from './query_bar';
import { RemoteProvider } from './remote';
import { RenderableProvider } from './renderable';
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
import { MenuToggleProvider } from './menu_toggle';
import { MonacoEditorProvider } from './monaco_editor';

export const services = {
  ...commonServiceProviders,

  __webdriver__: RemoteProvider,
  filterBar: FilterBarService,
  queryBar: QueryBarProvider,
  find: FindProvider,
  testSubjects: TestSubjects,
  docTable: DocTableService,
  screenshots: ScreenshotsService,
  snapshots: SnapshotsService,
  failureDebugging: FailureDebuggingProvider,
  listingTable: ListingTableService,
  dashboardVisualizations: DashboardVisualizationsService,
  dashboardExpect: DashboardExpectService,
  dashboardAddPanel: DashboardAddPanelService,
  dashboardReplacePanel: DashboardReplacePanelService,
  dashboardPanelActions: DashboardPanelActionsService,
  flyout: FlyoutService,
  comboBox: ComboBoxService,
  dataGrid: DataGridService,
  embedding: EmbeddingProvider,
  renderable: RenderableProvider,
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
  monacoEditor: MonacoEditorProvider,
  MenuToggle: MenuToggleProvider,
};
