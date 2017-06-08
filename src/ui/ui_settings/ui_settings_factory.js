import { UiSettingsService } from './ui_settings';

/**
 *  Create an instance of UiSettingsService that will use the
 *  passed `callCluster` function to communicate with elasticsearch
 *
 *  @param  {Function} callCluster should accept a method name as a string and a params object
 *  @return {UiSettingsService}
 */
export function uiSettingsServiceFactory(server, options = {}) {
  const config = server.config();

  const {
    callCluster,
    readInterceptor
  } = options;

  return new UiSettingsService({
    index: config.get('kibana.index'),
    type: 'config',
    id: config.get('pkg.version'),
    callCluster,
    readInterceptor,
  });
}
