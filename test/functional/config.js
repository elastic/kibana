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
} from './services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));

  return {
    testFiles: [
      require.resolve('./apps/console'),
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
      timelion: TimelionPageProvider
    },
    services: {
      es: commonConfig.get('services.es'),
      esArchiver: commonConfig.get('services.esArchiver'),
      kibanaServer: commonConfig.get('services.kibanaServer'),
      retry: commonConfig.get('services.retry'),
      remote: RemoteProvider,
      filterBar: FilterBarProvider,
      queryBar: QueryBarProvider,
      find: FindProvider,
      testSubjects: TestSubjectsProvider,
      docTable: DocTableProvider,
      screenshots: ScreenshotsProvider,
      dashboardVisualizations: DashboardVisualizationProvider,
      dashboardExpect: DashboardExpectProvider,
    },
    servers: commonConfig.get('servers'),
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
