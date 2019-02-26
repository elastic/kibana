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

import {
  AppsMenuProvider,
  BrowserProvider,
  ComboBoxProvider,
  DocTableProvider,
  EmbeddingProvider,
  FailureDebuggingProvider,
  FilterBarProvider,
  FindProvider,
  FlyoutProvider,
  GlobalNavProvider,
  InspectorProvider,
  PieChartProvider,
  QueryBarProvider,
  RenderableProvider,
  ScreenshotsProvider,
  TableProvider,
  TestSubjectsProvider,
  VisualizeListingTableProvider,
} from 'functional/services';

import { ToolingLog } from '@kbn/dev-utils';

import { CommonServicesMap } from './common';
import { ServerIntegrationServicesMap } from './server_integration';

// https://stackoverflow.com/a/49889856/6515842
export type ExtractPromise<T> = T extends Promise<infer U> ? U : T;

export interface ConfigProvider {
  get(name: string): any;
}

export interface ServicesMap extends CommonServicesMap, ServerIntegrationServicesMap {
  config: ConfigProvider;
  appsMenu: ReturnType<typeof AppsMenuProvider>;
  browser: ReturnType<typeof BrowserProvider>;
  screenshots: ExtractPromise<ReturnType<typeof ScreenshotsProvider>>;
  comboBox: ReturnType<typeof ComboBoxProvider>;
  find: ReturnType<typeof FindProvider>;
  docTable: ReturnType<typeof DocTableProvider>;
  embedding: ReturnType<typeof EmbeddingProvider>;
  failureDebugging: ReturnType<typeof FailureDebuggingProvider>;
  filterBar: ReturnType<typeof FilterBarProvider>;
  flyout: ReturnType<typeof FlyoutProvider>;
  globalNav: ReturnType<typeof GlobalNavProvider>;
  inspector: ReturnType<typeof InspectorProvider>;
  pieChart: ReturnType<typeof PieChartProvider>;
  queryBar: ReturnType<typeof QueryBarProvider>;
  __leadfoot__: Element;
  renderable: ReturnType<typeof RenderableProvider>;
  table: ReturnType<typeof TableProvider>;
  testSubjects: ReturnType<typeof TestSubjectsProvider>;
  visualizeListingTable: ReturnType<typeof VisualizeListingTableProvider>;
  log: ToolingLog;
  dashboardAddPanel: any;
  lifecycle: any;
}

export * from './common';
export * from './server_integration';
