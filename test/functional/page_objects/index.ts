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
// @ts-ignore not TS yet
import { ConsolePageProvider } from './console_page';
// @ts-ignore not TS yet
import { ContextPageProvider } from './context_page';
// @ts-ignore not TS yet
import { DashboardPageProvider } from './dashboard_page';
// @ts-ignore not TS yet
import { DiscoverPageProvider } from './discover_page';
// @ts-ignore not TS yet
import { ErrorPageProvider } from './error_page';
// @ts-ignore not TS yet
import { HeaderPageProvider } from './header_page';
// @ts-ignore not TS yet
import { HomePageProvider } from './home_page';
// @ts-ignore not TS yet
import { MonitoringPageProvider } from './monitoring_page';
import { NewsfeedPageProvider } from './newsfeed_page';
// @ts-ignore not TS yet
import { PointSeriesPageProvider } from './point_series_page';
// @ts-ignore not TS yet
import { SettingsPageProvider } from './settings_page';
// @ts-ignore not TS yet
import { SharePageProvider } from './share_page';
// @ts-ignore not TS yet
import { ShieldPageProvider } from './shield_page';
// @ts-ignore not TS yet
import { TimePickerPageProvider } from './time_picker';
// @ts-ignore not TS yet
import { TimelionPageProvider } from './timelion_page';
import { VisualBuilderPageProvider } from './visual_builder_page';
// @ts-ignore not TS yet
import { VisualizePageProvider } from './visualize_page';
import { VisualEditorPageProvider } from './visual_editor_page';

export const pageObjects = {
  common: CommonPageProvider,
  console: ConsolePageProvider,
  context: ContextPageProvider,
  dashboard: DashboardPageProvider,
  discover: DiscoverPageProvider,
  error: ErrorPageProvider,
  header: HeaderPageProvider,
  home: HomePageProvider,
  monitoring: MonitoringPageProvider,
  newsfeed: NewsfeedPageProvider,
  pointSeries: PointSeriesPageProvider,
  settings: SettingsPageProvider,
  share: SharePageProvider,
  shield: ShieldPageProvider,
  timelion: TimelionPageProvider,
  timePicker: TimePickerPageProvider,
  visualBuilder: VisualBuilderPageProvider,
  visualize: VisualizePageProvider,
  visEditor: VisualEditorPageProvider,
};
