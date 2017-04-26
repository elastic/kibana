import uiModules from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
import { modifyUrl } from 'ui/url';

marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

uiModules.get('kibana')
  .service('tilemapSettings', function ($http, tilemapsConfig, $sanitize, kbnVersion) {
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

        this._queryParams = {
          my_app_version: kbnVersion
        };
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
            const service = _.get(response, 'data.services[0]');
            if (!service) {
              throw new Error('Manifest response does not include sufficient service data.');
            }

            this._error = null;
            this._tmsOptions = {
              attribution: $sanitize(marked(service.attribution)),
              minZoom: service.minZoom,
              maxZoom: service.maxZoom,
              subdomains: service.subdomains || []
            };

            this._url = unescapeTemplateVars(extendUrl(service.url, {
              query: this._queryParams
            }));

            this._settingsInitialized = true;
          })
          .catch(e => {
            this._settingsInitialized = true;

            if (!e) {
              e = new Error('Unkown error');
            }

            if (!(e instanceof Error)) {
              e = new Error(e.data || `status ${e.statusText || e.status}`);
            }

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
      getMinMaxZoom(isWMSEnabled) {
        if (isWMSEnabled) {
          return {
            minZoom: 0,
            maxZoom: 18
          };
        }

        //Otherwise, we use the settings from the yml.
        //note that it is no longer possible to only override the zoom-settings, since all options are read from the manifest
        //by default.
        //For a custom configuration, users will need to override tilemap.url as well.
        return {
          minZoom: this._tmsOptions.minZoom,
          maxZoom: this._tmsOptions.maxZoom
        };

      }

      isInitialized() {
        return this._settingsInitialized;
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
      _getTileServiceManifest(manifestUrl) {
        return $http({
          url: extendUrl(manifestUrl, { query: this._queryParams }),
          method: 'GET'
        });
      }

    }

    return new TilemapSettings();
  });
