import { UiSettings } from './ui_settings';
import { mirrorStatus } from './mirror_status';

export function uiSettingsMixin(kbnServer, server, config) {
  const status = kbnServer.status.create('ui settings');

  if (!config.get('uiSettings.enabled')) {
    status.disabled('uiSettings.enabled config is set to `false`');
    return;
  }

  const uiSettings = new UiSettings(server, status);
  server.decorate('server', 'uiSettings', () => uiSettings);
  kbnServer.ready().then(() => {
    mirrorStatus(status, kbnServer.status.getForPluginId('elasticsearch'));
  });
}
