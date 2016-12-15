import uiModules from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
import url from 'url';

marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});


uiModules.get('kibana')
  .service('tilemapSettings', function ($http, mapsConfig, $sanitize) {

    const attributionFromConfig = $sanitize(marked(mapsConfig.deprecated.config.options.attribution));
    const optionsFromConfig = _.assign({}, mapsConfig.deprecated.config.options, {attribution: attributionFromConfig});

    /**
     * Object to read out the map-service configuration
     *
     * @type {Object}
     */
    const mapSettings = {

      _queryParams: {license: ""},//this curheprently a mandatory parameter. Remove when no longer the case.
      _settingsInitialized: false,

      //initialize settings with the default of the configuration
      _url: mapsConfig.deprecated.config.url,
      _options: optionsFromConfig,

      /**
       * Must be called before getUrl/getOptions can be called.
       */
      whenSettingsReady: async function () {

        if (!mapsConfig.deprecated.isConfiguredWithDefault) {//if settings are overridden, we will use those.
          return true;
        }

        if (this._settingsInitialized) {
          return true;
        }

        let manifest;
        try {
          const response = await getTileServiceManifest(mapsConfig.config.manifest, this._queryParams, attributionFromConfig, optionsFromConfig);
          manifest = response.data;
        } catch (e) {
          //request failed. Continue to use old settings.
          this._settingsInitialized = true;
          return true;
        }

        this._options = {
          attribution: $sanitize(marked(manifest.services[0].attribution)),
          minZoom: manifest.services[0].minZoom,
          maxZoom: manifest.services[0].maxZoom,
          subdomains: []
        };

        const queryparams = _.assign({license: this._licenseUid}, manifest.services[0].query_parameters);
        const query = url.format({query: queryparams});
        this._url = manifest.services[0].url + query;//must preserve {} patterns from the url, so do not format path.

        this._settingsInitialized = true;
        return true;
      },
      /**
       * add optional query-parameter that will be submitted to the tile service
       * @param additionalQueryParams
       */
      addQueryParams: function (additionalQueryParams) {
        this._queryParams = _.assign({}, this._queryParams, additionalQueryParams);
      },

      /**
       * Get the url of the default TMS
       * @return {string}
       */
      getUrl() {
        return this._url;
      },
      /**
       * Get the options of the default TMS
       * @return {{}}
       */
      getOptions() {
        return this._options;
      }
    };

    return mapSettings;


    /**
     * mocks call to manifest
     * will be replaced with AJAX-call to the service when available.
     *       A sample response would look something like;
     *
     {
   "version":"0.0.0",
   "expiry":"14d",
   "services":[
      {
         "id":"road_map",
         "url":"https://proxy-tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
         "minZoom":0,
         "maxZoom":12,
         "attribution":"© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
         "query_parameters":{
            "elastic_tile_service_tos":"agree",
            "my_app_name":"kibana"
         }
      }
   ]
    }
     *
     */
    async function getTileServiceManifest(manifestUrl, additionalQueryParams) {

      const manifestServiceTokens = url.parse(manifestUrl);
      manifestServiceTokens.query = _.assign({}, manifestServiceTokens.query, additionalQueryParams);
      const requestUrl = url.format(manifestServiceTokens);

      return await $http({
        url: requestUrl,
        method: 'GET'
      });

    }
  });



