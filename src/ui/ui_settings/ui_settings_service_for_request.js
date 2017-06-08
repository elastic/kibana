import { uiSettingsServiceFactory } from './ui_settings_service_factory';

const BY_REQUEST_CACHE = new WeakMap();

export function getUiSettingsServiceForRequest(server, request, readInterceptor) {
  if (BY_REQUEST_CACHE.has(request)) {
    return BY_REQUEST_CACHE.get(request);
  }

  const adminCluster = server.plugins.elasticsearch.getCluster('admin');
  const uiSettingsServices = uiSettingsServiceFactory(server, {
    readInterceptor,
    callCluster(...args) {
      return adminCluster.callWithRequest(request, ...args);
    }
  });

  BY_REQUEST_CACHE.set(request, uiSettingsServices);
  return uiSettingsServices;
}
