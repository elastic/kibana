import uiModules from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
import url from 'url';
import uiRoutes from 'ui/routes';
import { modifyUrl } from 'ui/url';

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

    const extendUrl = (url, props) => (
      modifyUrl(url, parsed => _.merge(parsed, props))
    );

    /**
     *  Unescape a url template that was escaped by encodeURI() so leaflet
     *  will be able to correctly locate the varables in the template
     *  @param  {String} url
     *  @return {String}
     */
    const unescapeTemplateVars = url => {
      const ENCODED_TEMPLATE_VARS_RE = /%7B(\w+?)%7D/g;
      return url.replace(ENCODED_TEMPLATE_VARS_RE, (total, varName) => `{${varName}}`);
    };

    class TilemapSettings {

      constructor() {

        this._queryParams = {};
        this._error = null;

        //initialize settings with the default of the configuration
        this._url = tilemapsConfig.deprecated.config.url;
        this._tmsOptions = optionsFromConfig;

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

          return this._getTileServiceManifest(tilemapsConfig.manifestServiceUrl, this._queryParams)
          .then(response => {
            const manifest = response.data;
            this._error = null;

            this._tmsOptions = {
              attribution: $sanitize(marked(manifest.services[0].attribution)),
              minZoom: manifest.services[0].minZoom,
              maxZoom: manifest.services[0].maxZoom,
              subdomains: []
            };

            this._url = unescapeTemplateVars(extendUrl(manifest.services[0].url, {
              query: {
                ...(manifest.services[0].query_parameters || {}),
                ...this._queryParams
              }
            }));

            this._settingsInitialized = true;
          })
          .catch(e => {
            this._settingsInitialized = true;
            this._error = new Error(`Could not retrieve manifest from the tile service: ${e.message}`);
          })
          .then(() => {
            return true;
          });
        });
      }

      /**
       * Must be called before getUrl/getTMSOptions/getMapOptions can be called.
       */
      loadSettings() {
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
      getTMSOptions() {
        if (!this._settingsInitialized) {
          throw new Error('Cannot retrieve options before calling .loadSettings first');
        }
        return this._tmsOptions;
      }


      /**
       * @return {{maxZoom: (*|number), minZoom: (*|number)}}
       */
      getMapZoomOptions(isWMSEnabled) {
        //if WMS is enabled, we do not want to use the zoom-configuration from the manifest.
        if (isWMSEnabled) {
          return {
            maxZoom: optionsFromConfig.maxZoom,
            minZoom: optionsFromConfig.minZoom
          };
        }

        //Otherwise, we use the settings from the yml.
        //note that it is no longer possible to only override the zoom-settings, since all options are read from the manifest
        //by default.
        //For a custom configuration, users will need to override tilemap.url as well.
        return {
          maxZoom: this._tmsOptions.maxZoom,
          minZoom: this._tmsOptions.minZoom
        };

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
      _getTileServiceManifest(manifestUrl, additionalQueryParams) {
        return $http({
          url: extendUrl(manifestUrl, { query: this._queryParams }),
          method: 'GET'
        });
      }

    }

    return new TilemapSettings();
  });
