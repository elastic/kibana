/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
import { SavedObjectsPageProvider } from './management/saved_objects_page';
import { LegacyDataTableVisProvider } from './legacy/data_table_vis';

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
  legacyDataTableVis: LegacyDataTableVisProvider,
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
  savedObjects: SavedObjectsPageProvider,
};
