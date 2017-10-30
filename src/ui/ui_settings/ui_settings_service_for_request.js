import { uiSettingsServiceFactory } from './ui_settings_service_factory';

/**
 *  Get/create an instance of UiSettingsService bound to a specific request.
 *  Each call is cached (keyed on the request object itself) and subsequent
 *  requests will get the first UiSettingsService instance even if the `options`
 *  have changed.
 *
 *  @param {Hapi.Server} server
 *  @param {Hapi.Request} request
 *  @param {Object} [options={}]
 *  @property {AsyncFunction} [options.getDefaults] async function that returns defaults/details about
 *                            the uiSettings.
 *  @return {UiSettingsService}
 */
export function getUiSettingsServiceForRequest(server, request, options = {}) {
  const {
    getDefaults
  } = options;

  const uiSettingsService = uiSettingsServiceFactory(server, {
    getDefaults,
    savedObjectsClient: request.getSavedObjectsClient()
  });

  return uiSettingsService;
}
