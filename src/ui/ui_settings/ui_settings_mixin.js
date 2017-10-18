import { uiSettingsServiceFactory } from './ui_settings_service_factory';
import { getUiSettingsServiceForRequest } from './ui_settings_service_for_request';
import { UiExportsConsumer } from './ui_exports_consumer';
import {
  deleteRoute,
  getRoute,
  setManyRoute,
  setRoute,
} from './routes';

export function uiSettingsMixin(kbnServer, server) {
  // reads the "uiSettingDefaults" from uiExports
  const uiExportsConsumer = new UiExportsConsumer();
  kbnServer.uiExports.addConsumer(uiExportsConsumer);

  const getDefaults = () => (
    uiExportsConsumer.getUiSettingDefaults()
  );

  server.decorate('server', 'uiSettingsServiceFactory', (options = {}) => {
    return uiSettingsServiceFactory(server, {
      getDefaults,
      ...options
    });
  });

  server.addMemoizedFactoryToRequest('getUiSettingsService', request => {
    return getUiSettingsServiceForRequest(server, request, {
      getDefaults,
    });
  });

  server.decorate('server', 'uiSettings', () => {
    throw new Error(`
      server.uiSettings has been removed, see https://github.com/elastic/kibana/pull/12243.
    `);
  });

  server.route(deleteRoute);
  server.route(getRoute);
  server.route(setManyRoute);
  server.route(setRoute);
}
