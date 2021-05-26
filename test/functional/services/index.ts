/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { services as commonServiceProviders } from '../../common/services';

import { AppsMenuProvider } from './apps_menu';
import {
  BrowserProvider,
  FailureDebuggingProvider,
  FindProvider,
  ScreenshotsProvider,
  SnapshotsProvider,
  TestSubjectsProvider,
} from './common';
import { ComboBoxProvider } from './combo_box';
import {
  DashboardAddPanelProvider,
  DashboardReplacePanelProvider,
  DashboardExpectProvider,
  DashboardPanelActionsProvider,
  DashboardVisualizationProvider,
} from './dashboard';
import { DocTableService } from './doc_table';
import { EmbeddingProvider } from './embedding';
import { FilterBarService } from './filter_bar';
import { FlyoutProvider } from './flyout';
import { GlobalNavProvider } from './global_nav';
import { InspectorProvider } from './inspector';
import { FieldEditorService } from './field_editor';
import { ManagementMenuProvider } from './management';
import { QueryBarProvider } from './query_bar';
import { RemoteProvider } from './remote';
import { RenderableProvider } from './renderable';
import { ToastsProvider } from './toasts';
import { DataGridProvider } from './data_grid';
import {
  PieChartProvider,
  ElasticChartProvider,
  VegaDebugInspectorViewProvider,
} from './visualizations';
import { ListingTableProvider } from './listing_table';
import { SavedQueryManagementComponentProvider } from './saved_query_management_component';
import { KibanaSupertestProvider } from './supertest';
import { MenuToggleProvider } from './menu_toggle';
import { MonacoEditorProvider } from './monaco_editor';

export const services = {
  ...commonServiceProviders,

  __webdriver__: RemoteProvider,
  filterBar: FilterBarService,
  queryBar: QueryBarProvider,
  find: FindProvider,
  testSubjects: TestSubjectsProvider,
  docTable: DocTableService,
  screenshots: ScreenshotsProvider,
  snapshots: SnapshotsProvider,
  dashboardVisualizations: DashboardVisualizationProvider,
  dashboardExpect: DashboardExpectProvider,
  failureDebugging: FailureDebuggingProvider,
  listingTable: ListingTableProvider,
  dashboardAddPanel: DashboardAddPanelProvider,
  dashboardReplacePanel: DashboardReplacePanelProvider,
  dashboardPanelActions: DashboardPanelActionsProvider,
  flyout: FlyoutProvider,
  comboBox: ComboBoxProvider,
  dataGrid: DataGridProvider,
  embedding: EmbeddingProvider,
  renderable: RenderableProvider,
  browser: BrowserProvider,
  pieChart: PieChartProvider,
  inspector: InspectorProvider,
  fieldEditor: FieldEditorService,
  vegaDebugInspector: VegaDebugInspectorViewProvider,
  appsMenu: AppsMenuProvider,
  globalNav: GlobalNavProvider,
  toasts: ToastsProvider,
  savedQueryManagementComponent: SavedQueryManagementComponentProvider,
  elasticChart: ElasticChartProvider,
  supertest: KibanaSupertestProvider,
  managementMenu: ManagementMenuProvider,
  monacoEditor: MonacoEditorProvider,
  MenuToggle: MenuToggleProvider,
};
