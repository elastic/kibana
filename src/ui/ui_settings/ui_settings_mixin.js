import { uiSettingsServiceFactory } from './ui_settings_service_factory';
import { getUiSettingsServiceForRequest } from './ui_settings_service_for_request';
import {
  deleteRoute,
  getRoute,
  setManyRoute,
  setRoute,
} from './routes';

export function uiSettingsMixin(kbnServer, server) {
  const getDefaults = () => (
    kbnServer.uiExports.uiSettingDefaults
  );

  const identifierCache = new WeakMap();
  server.decorate('request', 'setUiSettingsIdSuffix', function (identifier) {
    const request = this;

    if (identifierCache.has(request)) {
      throw new Error(`UI Settings ID Suffix has already been set for this request`);
    }

    identifierCache.set(request, identifier);
  });

  server.decorate('server', 'uiSettingsServiceFactory', (options = {}) => {
    return uiSettingsServiceFactory(server, {
      getDefaults,
      ...options
    });
  });

  server.addMemoizedFactoryToRequest('getUiSettingsService', request => {
    return getUiSettingsServiceForRequest(server, request, {
      getDefaults,
      idSuffix: identifierCache.get(request)
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
