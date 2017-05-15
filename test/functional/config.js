import { resolve } from 'path';

import {
  CommonPageProvider,
  ConsolePageProvider,
  ShieldPageProvider,
  ContextPageProvider,
  DiscoverPageProvider,
  HeaderPageProvider,
  DashboardPageProvider,
  VisualizePageProvider,
  SettingsPageProvider,
  MonitoringPageProvider,
  PointSeriesPageProvider,
} from './page_objects';

import {
  RemoteProvider,
  FindProvider,
  RetryProvider,
  TestSubjectsProvider,
  KibanaServerProvider,
  EsProvider,
  EsArchiverProvider,
  DocTableProvider,
  ScreenshotsProvider,
} from './services';

import { servers, apps } from '../server_config';

export default function () {
  return {
    testFiles: [
      resolve(__dirname, './apps/console/index.js'),
      resolve(__dirname, './apps/context/index.js'),
      resolve(__dirname, './apps/dashboard/index.js'),
      resolve(__dirname, './apps/discover/index.js'),
      resolve(__dirname, './apps/management/index.js'),
      resolve(__dirname, './apps/status_page/index.js'),
      resolve(__dirname, './apps/visualize/index.js'),
      resolve(__dirname, './apps/xpack/index.js'),
    ],
    pageObjects: {
      common: CommonPageProvider,
      console: ConsolePageProvider,
      shield: ShieldPageProvider,
      context: ContextPageProvider,
      discover: DiscoverPageProvider,
      header: HeaderPageProvider,
      dashboard: DashboardPageProvider,
      visualize: VisualizePageProvider,
      settings: SettingsPageProvider,
      monitoring: MonitoringPageProvider,
      pointSeries: PointSeriesPageProvider,
    },
    services: {
      kibanaServer: KibanaServerProvider,
      remote: RemoteProvider,
      find: FindProvider,
      retry: RetryProvider,
      testSubjects: TestSubjectsProvider,
      es: EsProvider,
      esArchiver: EsArchiverProvider,
      docTable: DocTableProvider,
      screenshots: ScreenshotsProvider,
    },
    servers,
    apps,
    esArchiver: {
      directory: resolve(__dirname, '../../src/fixtures/es_archives'),
    },
    screenshots: {
      directory: resolve(__dirname, '../screenshots'),
    }
  };
}
