import { uiSettingsServiceFactory } from './ui_settings_factory';
import { getUiSettingsServiceForRequest } from './ui_settings_for_request';
import { mirrorStatus } from './mirror_status';

export function uiSettingsMixin(kbnServer, server, config) {
  const status = kbnServer.status.create('ui settings');

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
  const readUiSettingsInterceptor = () => {
    if (status.state !== 'green') {
      return {};
    }
  };

  // don't return, just let it happen when the plugins are ready
  kbnServer.ready().then(() => {
    mirrorStatus(status, kbnServer.status.getForPluginId('elasticsearch'));
  });

  server.decorate('server', 'uiSettingsServiceFactory', function (options) {
    return uiSettingsServiceFactory(server, options);
  });

  server.decorate('request', 'getUiSettingsService', function () {
    return getUiSettingsServiceForRequest(server, this, readUiSettingsInterceptor);
  });

  server.decorate('server', 'uiSettings', () => {
    throw new Error(`
      server.uiSettings has been removed, use \`request.getUiSettingsService()\`
      or \`server.uiSettingsServiceFactory(options)\` instead.
    `);
  });
}
