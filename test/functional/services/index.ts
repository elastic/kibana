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
  DashboardExpectProvider,
  DashboardPanelActionsProvider,
  DashboardVisualizationProvider,
  // @ts-ignore not TS yet
} from './dashboard';
// @ts-ignore not TS yet
import { DocTableProvider } from './doc_table';
// @ts-ignore not TS yet
import { EmbeddingProvider } from './embedding';
// @ts-ignore not TS yet
import { FailureDebuggingProvider } from './failure_debugging';
// @ts-ignore not TS yet
import { FilterBarProvider } from './filter_bar';
import { FindProvider } from './find';
// @ts-ignore not TS yet
import { FlyoutProvider } from './flyout';
// @ts-ignore not TS yet
import { GlobalNavProvider } from './global_nav';
// @ts-ignore not TS yet
import { InspectorProvider } from './inspector';
// @ts-ignore not TS yet
import { QueryBarProvider } from './query_bar';
import { RemoteProvider } from './remote';
// @ts-ignore not TS yet
import { RenderableProvider } from './renderable';
import { ScreenshotsProvider } from './screenshots';
// @ts-ignore not TS yet
import { SnapshotsProvider } from './snapshots';
// @ts-ignore not TS yet
import { TableProvider } from './table';
import { TestSubjectsProvider } from './test_subjects';
import { ToastsProvider } from './toasts';
// @ts-ignore not TS yet
import { PieChartProvider } from './visualizations';
// @ts-ignore not TS yet
import { VisualizeListingTableProvider } from './visualize_listing_table';

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
};
