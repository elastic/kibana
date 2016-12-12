import uiModules from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
import url from 'url';

marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});


uiModules.get('kibana')
  .service('tilemapSettings', function ($http, tilemap, $sanitize) {

    const attributionFromConfig = $sanitize(marked(tilemap.config.options.attribution));
    const optionsFromConfig = _.assign({}, tilemap.config.options, {attribution: attributionFromConfig});

    /**
     * Object to read out the map-service configuration
     *
     * @type {Object}
     */
    const mapSettings = {

      _queryParams: {},
      _licenseUid: '',
      _manifest: null,

      //intiialize settings with the default of the configuration
      _url: tilemap.config.url,
      _options: optionsFromConfig,

      /**
       * Must be called before getUrl/getOptions can be called.
       */
      whenSettingsReady: async function () {

        if (!tilemap.isConfiguredWithDefault) {//if settings are overridden, we will use those.
          return true;
        }

        if (this._manifest) {
          return true;
        }

        this._manifest = await getTileServiceManifest(this._licenseUid);
        this._options = {
          attribution: $sanitize(marked(this._manifest.services[0].attribution)),
          minZoom: this._manifest.services[0].minZoom,
          maxZoom: this._manifest.services[0].maxZoom,
          subdomains: []
        };

        const queryparams = _.assign({license: this._licenseUid}, this._manifest.services[0].query_parameters);
        const query = url.format({
          query: queryparams
        });
        this._url = this._manifest.services[0].url + query;//must preserve {} patterns from the url, so do not format path.
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
     */
    async function getTileServiceManifest(licenseId) {
      try {
        return await $http({
          url: 'https://proxy-tiles.elastic.co/v1/manifest?license=' + licenseId,
          method: 'GET'
        });
      } catch (e) {
        //fake return for now
        return JSON.parse(`{
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
}`);
      }
    }
  });



