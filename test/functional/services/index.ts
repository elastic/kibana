/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { services as commonServiceProviders } from '../../common/services';

import { AppsMenuProvider } from './apps_menu';
import { BrowserProvider } from './browser';
import { ComboBoxProvider } from './combo_box';
import {
  DashboardAddPanelProvider,
  DashboardReplacePanelProvider,
  DashboardExpectProvider,
  DashboardPanelActionsProvider,
  DashboardVisualizationProvider,
  // @ts-ignore not TS yet
} from './dashboard';
import { DocTableProvider } from './doc_table';
import { ElasticChartProvider } from './elastic_chart';
import { EmbeddingProvider } from './embedding';
import { FailureDebuggingProvider } from './failure_debugging';
import { FilterBarProvider } from './filter_bar';
import { FindProvider } from './find';
import { FlyoutProvider } from './flyout';
import { GlobalNavProvider } from './global_nav';
import { InspectorProvider } from './inspector';
import { QueryBarProvider } from './query_bar';
import { RemoteProvider } from './remote';
import { RenderableProvider } from './renderable';
import { ScreenshotsProvider } from './screenshots';
import { SnapshotsProvider } from './snapshots';
import { TableProvider } from './table';
import { TestSubjectsProvider } from './test_subjects';
import { ToastsProvider } from './toasts';
// @ts-ignore not TS yet
import { PieChartProvider } from './visualizations';
import { VisualizeListingTableProvider } from './visualize_listing_table';
import { SavedQueryManagementComponentProvider } from './saved_query_management_component';
import { SecurityProvider } from './security';

export const services = {
  ...commonServiceProviders,

  __webdriver__: RemoteProvider,
  filterBar: FilterBarProvider,
  queryBar: QueryBarProvider,
  find: FindProvider,
  testSubjects: TestSubjectsProvider,
  docTable: DocTableProvider,
  screenshots: ScreenshotsProvider,
  snapshots: SnapshotsProvider,
  dashboardVisualizations: DashboardVisualizationProvider,
  dashboardExpect: DashboardExpectProvider,
  failureDebugging: FailureDebuggingProvider,
  visualizeListingTable: VisualizeListingTableProvider,
  dashboardAddPanel: DashboardAddPanelProvider,
  dashboardReplacePanel: DashboardReplacePanelProvider,
  dashboardPanelActions: DashboardPanelActionsProvider,
  flyout: FlyoutProvider,
  comboBox: ComboBoxProvider,
  embedding: EmbeddingProvider,
  renderable: RenderableProvider,
  table: TableProvider,
  browser: BrowserProvider,
  pieChart: PieChartProvider,
  inspector: InspectorProvider,
  appsMenu: AppsMenuProvider,
  globalNav: GlobalNavProvider,
  toasts: ToastsProvider,
  savedQueryManagementComponent: SavedQueryManagementComponentProvider,
  elasticChart: ElasticChartProvider,
  security: SecurityProvider,
};
