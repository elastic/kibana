import { UiSettingsService } from './ui_settings_service';

/**
 *  Create an instance of UiSettingsService that will use the
 *  passed `callCluster` function to communicate with elasticsearch
 *
 *  @param {Hapi.Server} server
 *  @param {Object} options
 *  @property {AsyncFunction} options.callCluster function that accepts a method name and
 *                            param object which causes a request via some elasticsearch client
 *  @property {AsyncFunction} [options.getDefaults] async function that returns defaults/details about
 *                            the uiSettings.
 *  @property {AsyncFunction} [options.readInterceptor] async function that is called when the
 *                            UiSettingsService does a read() an has an oportunity to intercept the
 *                            request and return an alternate `_source` value to use.
 *  @return {UiSettingsService}
 */
export function uiSettingsServiceFactory(server, options) {
  const config = server.config();

  const {
    savedObjectsClient,
    readInterceptor,
    getDefaults,
  } = options;

  return new UiSettingsService({
    type: 'config',
    id: config.get('pkg.version'),
    savedObjectsClient,
    readInterceptor,
    getDefaults,
  });
}
