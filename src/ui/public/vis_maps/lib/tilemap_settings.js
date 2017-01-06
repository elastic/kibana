import uiModules from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
import url from 'url';
import uiRoutes from 'ui/routes';

marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

/**
 * Reloads the setting for each route,
 * This is to ensure, that if the license changed during the lifecycle of the application,
 * we get an update.
 * tilemapSettings itself will take care that the manifest-service is not queried when not necessary.
 */
uiRoutes.afterSetupWork(function (tilemapSettings) {
  return tilemapSettings.loadSettings();
});

uiModules.get('kibana')
  .service('tilemapSettings', function ($http, tilemapsConfig, $sanitize) {

    const attributionFromConfig = $sanitize(marked(tilemapsConfig.deprecated.config.options.attribution || ''));
    const optionsFromConfig = _.assign({}, tilemapsConfig.deprecated.config.options, { attribution: attributionFromConfig });

    class TilemapSettings {

      constructor() {

        this._queryParams = {};
        this._error = null;

        //initialize settings with the default of the configuration
        this._url = tilemapsConfig.deprecated.config.url;
        this._options = optionsFromConfig;

        this._invalidateSettings();

      }


      _invalidateSettings() {

        this._settingsInitialized = false;
        this._loadSettings = _.once(async() => {

          if (tilemapsConfig.deprecated.isOverridden) {//if settings are overridden, we will use those.
            this._settingsInitialized = true;
          }

          if (this._settingsInitialized) {
            return true;
          }

          let manifest;
          try {
            const response = await this._getTileServiceManifest(tilemapsConfig.manifestServiceUrl, this._queryParams,
              attributionFromConfig, optionsFromConfig);
            manifest = response.data;
            this._error = null;
          } catch (e) {
            //request failed. Continue to use old settings.
            this._settingsInitialized = true;
            this._error = new Error(`Could not retrieve map service configuration from the manifest-service. ${e.message}`);
            return true;
          }

          this._options = {
            attribution: $sanitize(marked(manifest.services[0].attribution)),
            minZoom: manifest.services[0].minZoom,
            maxZoom: manifest.services[0].maxZoom,
            subdomains: []
          };

          //additional query params need to be propagated to the TMS endpoint as well.
          const queryparams = _.assign({ }, manifest.services[0].query_parameters, this._queryParams);
          const query = url.format({ query: queryparams });
          this._url = manifest.services[0].url + query;//must preserve {} patterns from the url, so do not format path.

          this._settingsInitialized = true;
          return true;
        });
      }

      /**
       * Must be called before getUrl/getOptions can be called.
       */
      async loadSettings() {
        return this._loadSettings();
      }

      /**
       * Add optional query-parameters for the request.
       * These are only applied when requesting dfrom the manifest.
       *
       * @param additionalQueryParams
       */
      addQueryParams(additionalQueryParams) {

        //check if there are any changes in the settings.
        let changes = false;
        for (const key in additionalQueryParams) {
          if (additionalQueryParams.hasOwnProperty(key)) {
            if (additionalQueryParams[key] !== this._queryParams[key]) {
              changes = true;
              break;
            }
          }
        }

        if (changes) {
          this._queryParams = _.assign({}, this._queryParams, additionalQueryParams);
          this._invalidateSettings();
        }

      }

      /**
       * Get the url of the default TMS
       * @return {string}
       */
      getUrl() {
        if (!this._settingsInitialized) {
          throw new Error('Cannot retrieve url before calling .loadSettings first');
        }
        return this._url;
      }

      /**
       * Get the options of the default TMS
       * @return {{}}
       */
      getOptions() {
        if (!this._settingsInitialized) {
          throw new Error('Cannot retrieve options before calling .loadSettings first');
        }
        return this._options;
      }

      /**
       * Checks if there was an error during initialization of the parameters
       */
      hasError() {
        return this._error !== null;
      }

      getError() {
        return this._error;
      }

      /**
       * Make this a method to allow for overrides by test code
       */
      async  _getTileServiceManifest(manifestUrl, additionalQueryParams) {
        const manifestServiceTokens = url.parse(manifestUrl);
        manifestServiceTokens.query = _.assign({}, manifestServiceTokens.query, additionalQueryParams);
        const requestUrl = url.format(manifestServiceTokens);
        return await $http({
          url: requestUrl,
          method: 'GET'
        });
      }

    }


    return new TilemapSettings();


  });

