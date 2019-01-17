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
  CommonPageProvider,
  ConsolePageProvider,
  ShieldPageProvider,
  ContextPageProvider,
  DiscoverPageProvider,
  HeaderPageProvider,
  HomePageProvider,
  DashboardPageProvider,
  VisualizePageProvider,
  SettingsPageProvider,
  MonitoringPageProvider,
  PointSeriesPageProvider,
  VisualBuilderPageProvider,
  TimelionPageProvider,
  SharePageProvider,
} from './page_objects';

import {
  RemoteProvider,
  FilterBarProvider,
  QueryBarProvider,
  FindProvider,
  TestSubjectsProvider,
  DocTableProvider,
  ScreenshotsProvider,
  DashboardVisualizationProvider,
  DashboardExpectProvider,
  FailureDebuggingProvider,
  VisualizeListingTableProvider,
  DashboardAddPanelProvider,
  DashboardPanelActionsProvider,
  FlyoutProvider,
  ComboBoxProvider,
  EmbeddingProvider,
  RenderableProvider,
  TableProvider,
  BrowserProvider,
  InspectorProvider,
  PieChartProvider,
} from './services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));

  return {
    testFiles: [
      require.resolve('./apps/console'),
      require.resolve('./apps/getting_started'),
      require.resolve('./apps/context'),
      require.resolve('./apps/dashboard'),
      require.resolve('./apps/discover'),
      require.resolve('./apps/home'),
      require.resolve('./apps/management'),
      require.resolve('./apps/status_page'),
      require.resolve('./apps/timelion'),
      require.resolve('./apps/visualize'),
      require.resolve('./apps/xpack'),
    ],
    pageObjects: {
      common: CommonPageProvider,
      console: ConsolePageProvider,
      shield: ShieldPageProvider,
      context: ContextPageProvider,
      discover: DiscoverPageProvider,
      header: HeaderPageProvider,
      home: HomePageProvider,
      dashboard: DashboardPageProvider,
      visualize: VisualizePageProvider,
      settings: SettingsPageProvider,
      monitoring: MonitoringPageProvider,
      pointSeries: PointSeriesPageProvider,
      visualBuilder: VisualBuilderPageProvider,
      timelion: TimelionPageProvider,
      share: SharePageProvider,
    },
    services: {
      es: commonConfig.get('services.es'),
      esArchiver: commonConfig.get('services.esArchiver'),
      kibanaServer: commonConfig.get('services.kibanaServer'),
      retry: commonConfig.get('services.retry'),
      __leadfoot__: RemoteProvider,
      filterBar: FilterBarProvider,
      queryBar: QueryBarProvider,
      find: FindProvider,
      testSubjects: TestSubjectsProvider,
      docTable: DocTableProvider,
      screenshots: ScreenshotsProvider,
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
    },
    servers: commonConfig.get('servers'),

    esTestCluster: commonConfig.get('esTestCluster'),

    kbnTestServer: {
      ...commonConfig.get('kbnTestServer'),
      serverArgs: [
        ...commonConfig.get('kbnTestServer.serverArgs'),
        '--oss',
      ],
    },

    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
      },
    },

    apps: {
      status_page: {
        pathname: '/status',
      },
      discover: {
        pathname: '/app/kibana',
        hash: '/discover',
      },
      context: {
        pathname: '/app/kibana',
        hash: '/context',
      },
      visualize: {
        pathname: '/app/kibana',
        hash: '/visualize',
      },
      dashboard: {
        pathname: '/app/kibana',
        hash: '/dashboards',
      },
      settings: {
        pathname: '/app/kibana',
        hash: '/management',
      },
      timelion: {
        pathname: '/app/timelion',
      },
      console: {
        pathname: '/app/kibana',
        hash: '/dev_tools/console',
      },
      account: {
        pathname: '/app/kibana',
        hash: '/account',
      },
      home: {
        pathname: '/app/kibana',
        hash: '/home',
      },
    },
    junit: {
      reportName: 'UI Functional Tests'
    }
  };
}
