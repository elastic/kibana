import { uiSettingsServiceFactory } from './ui_settings_service_factory';
import { getUiSettingsServiceForRequest } from './ui_settings_service_for_request';
import { mirrorStatus } from './mirror_status';
import { UiExportsConsumer } from './ui_exports_consumer';
import {
  deleteRoute,
  getRoute,
  setManyRoute,
  setRoute,
} from './routes';

export function uiSettingsMixin(kbnServer, server, config) {
  const status = kbnServer.status.create('ui settings');

  // reads the "uiSettingDefaults" from uiExports
  const uiExportsConsumer = new UiExportsConsumer();
  kbnServer.uiExports.addConsumer(uiExportsConsumer);

  if (!config.get('uiSettings.enabled')) {
    status.disabled('uiSettings.enabled config is set to `false`');
    return;
  }

  // Passed to the UiSettingsService.
  // UiSettingsService calls the function before trying to read data from
  // elasticsearch, giving us a chance to prevent it from happening.
  //
  // If the ui settings status isn't green we shouldn't be attempting to get
  // user settings, since we can't be sure that all the necessary conditions
  // (e.g. elasticsearch being available) are met.
  const readInterceptor = () => {
    if (status.state !== 'green') {
      return {};
    }
  };

  const getDefaults = () => (
    uiExportsConsumer.getUiSettingDefaults()
  );

  // don't return, just let it happen when the plugins are ready
  kbnServer.ready().then(() => {
    mirrorStatus(status, kbnServer.status.getForPluginId('elasticsearch'));
  });

  server.decorate('server', 'uiSettingsServiceFactory', (options = {}) => {
    return uiSettingsServiceFactory(server, {
      getDefaults,
      ...options
    });
  });

  server.decorate('request', 'getUiSettingsService', function () {
    return getUiSettingsServiceForRequest(server, this, {
      getDefaults,
      readInterceptor,
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
