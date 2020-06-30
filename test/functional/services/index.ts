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
import { DocTableProvider } from './doc_table';
import { EmbeddingProvider } from './embedding';
import { FilterBarProvider } from './filter_bar';
import { FlyoutProvider } from './flyout';
import { GlobalNavProvider } from './global_nav';
import { InspectorProvider } from './inspector';
import { QueryBarProvider } from './query_bar';
import { RemoteProvider } from './remote';
import { RenderableProvider } from './renderable';
import { TableProvider } from './table';
import { ToastsProvider } from './toasts';
import { PieChartProvider, ElasticChartProvider } from './visualizations';
import { ListingTableProvider } from './listing_table';
import { SavedQueryManagementComponentProvider } from './saved_query_management_component';
import { KibanaSupertestProvider } from './supertest';

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
  listingTable: ListingTableProvider,
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
  supertest: KibanaSupertestProvider,
};
