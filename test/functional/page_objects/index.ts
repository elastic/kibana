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

import { CommonPageProvider } from './common_page';
import { ConsolePageProvider } from './console_page';
import { ContextPageProvider } from './context_page';
import { DashboardPageProvider } from './dashboard_page';
import { DiscoverPageProvider } from './discover_page';
import { ErrorPageProvider } from './error_page';
import { HeaderPageProvider } from './header_page';
import { HomePageProvider } from './home_page';
import { NewsfeedPageProvider } from './newsfeed_page';
import { SettingsPageProvider } from './settings_page';
import { SharePageProvider } from './share_page';
import { LoginPageProvider } from './login_page';
import { TimePickerProvider } from './time_picker';
import { TimelionPageProvider } from './timelion_page';
import { VisualBuilderPageProvider } from './visual_builder_page';
import { VisualizePageProvider } from './visualize_page';
import { VisualizeEditorPageProvider } from './visualize_editor_page';
import { VisualizeChartPageProvider } from './visualize_chart_page';
import { TileMapPageProvider } from './tile_map_page';
import { TagCloudPageProvider } from './tag_cloud_page';
import { VegaChartPageProvider } from './vega_chart_page';

export const pageObjects = {
  common: CommonPageProvider,
  console: ConsolePageProvider,
  context: ContextPageProvider,
  dashboard: DashboardPageProvider,
  discover: DiscoverPageProvider,
  error: ErrorPageProvider,
  header: HeaderPageProvider,
  home: HomePageProvider,
  newsfeed: NewsfeedPageProvider,
  settings: SettingsPageProvider,
  share: SharePageProvider,
  login: LoginPageProvider,
  timelion: TimelionPageProvider,
  timePicker: TimePickerProvider,
  visualBuilder: VisualBuilderPageProvider,
  visualize: VisualizePageProvider,
  visEditor: VisualizeEditorPageProvider,
  visChart: VisualizeChartPageProvider,
  tileMap: TileMapPageProvider,
  tagCloud: TagCloudPageProvider,
  vegaChart: VegaChartPageProvider,
};
