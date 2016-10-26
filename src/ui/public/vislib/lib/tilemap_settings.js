import uiModules from 'ui/modules';
import _ from 'lodash';
import url from 'url';
import marked from 'marked';
import uiRoutes from 'ui/routes';

marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

/**
 * Object to read out the map-service configuration
 * Clients can register custom ways of resolving the url and the options
 * @type {Object}
 */
const mapSettings = {
  _lockDown: false,
  _settingsDelegates: [],
  _manifest: (new Promise((resolve, reject) => {
    uiRoutes.addSetupWork(async() => {
      const manifest = await getTileServiceManifest();
      const mapServiceConfig = mapSettings.getUrlAndOptionsForDefaultService(manifest.services, undefined);

      mapSettings.addMapSettingsDelegate({
        getUrl(defaultUrl) {
          if (mapServiceConfig) {
            const query = url.format({
              query: mapServiceConfig.query_params
            });
            return mapServiceConfig.url + query;//cannot lose patterns from url, so do not format path.
          } else {
            return defaultUrl;
          }
        },
        getOptions(defaultOptions) {
          return mapServiceConfig ? mapServiceConfig.options : defaultOptions;
        }
      });

      resolve(manifest);
    });
  })),
  addMapSettingsDelegate(delegateSettings) {
    if (this._lockDown) {
      return;
    }
    this._settingsDelegates.push(delegateSettings);
  },
  /**
   * Get the url of the default TMS
   * @return {string}
   */
  getUrl() {
    //traverse all delegates
    return this._settingsDelegates.reduce((accumulator, delegateSettings)=>delegateSettings.getUrl(accumulator), undefined);
  },
  /**
   * Get the options of the default TMS
   * @return {{}}
   */
  getOptions() {
    //traverse all delegates
    return this._settingsDelegates.reduce((accumulator, delegateSettings)=>delegateSettings.getOptions(accumulator), undefined);
  },
  /**
   * Get the map services manifest
   * @return {Promise|*}
   */
  async getManifest() {
    return this._manifest;
  },
  /**
   * utility function to retrieve the url and option
   * @param services a service object from the manifest
   * @param licenseType predicate that checks if the service is appropriate for the license
   * @return an object with the url and options. undefined if none could be found.
   */
  getUrlAndOptionsForDefaultService(services, licenseType) {
    for (let i = 0; i < services.length; i += 1) {
      if (services[i].license === licenseType) {//first hit is the default
        const mapServiceOptions = {
          attribution: marked(services[i].attribution),
          minZoom: services[i].minZoom,
          maxZoom: services[i].maxZoom,
          subdomains: []
        };
        return {
          url: services[i].url,
          options: mapServiceOptions,
          query_params: services[i].query_parameters
        };
      }
    }
  }
};

uiModules.get('kibana')
  .service('tilemapSettings', function (config, tilemap, $sanitize) {
    const attribution = $sanitize(marked(tilemap.config.options.attribution));
    const options = _.assign({}, tilemap.config.options, {attribution});

    /**
     * The default options and url are just read from the kibana.yml
     */
    mapSettings.addMapSettingsDelegate({
      getUrl(defaultUrl) {
        return tilemap.config.url;
      },
      getOptions(defaultOptions) {
        return options;
      }
    });

    //If the default options are overridden, we won't allow overriding other resolvers.
    mapSettings._lockDown = !tilemap.isConfiguredWithDefault;
    return mapSettings;
  });


/**
 * mocks call to manifest
 * will be replaced with AJAX-call to the service when available.
 */
async function getTileServiceManifest() {

  return new Promise(function (resolve, _) {

    setTimeout(function () {
      resolve(JSON.parse(`{
	"version": "0.0,0",
	"expiry": "14d",
	"services": [
		{
			"id": "road_map",
			"url": "https://tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
			"minZoom": 0,
			"maxZoom": 12,
			"attribution": "© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
			"query_parameters": {
				"elastic_tile_service_tos": "agree",
				"my_app_name": "kibana"
			}
		},
		{
			"id": "road_map",
			"license": "basic",
			"url": "https://tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
			"minZoom": 0,
			"maxZoom": 14,
			"attribution": "© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
			"query_parameters": {
				"elastic_tile_service_tos": "agree",
				"my_app_name": "kibana",
				"license_uid": "{license_uid}"
			}
		},
		{
			"id": "road_map",
			"license": "gold",
			"url": "https://tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
			"minZoom": 0,
			"maxZoom": 18,
			"attribution": "© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
			"query_parameters": {
				"elastic_tile_service_tos": "agree",
				"my_app_name": "kibana",
				"license_uid": "{license_uid}"
			}
		},
		{
			"id": "road_map",
			"license": "platinum",
			"url": "https://rm.tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
			"minZoom": 0,
			"maxZoom": 18,
			"attribution": "© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
			"query_parameters": {
				"elastic_tile_service_tos": "agree",
				"my_app_name": "kibana",
				"license_uid": "{license_uid}"
			}
		},
		{
			"id": "dark_road_map",
			"license": "platinum",
			"url": "https://dark.tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
			"minZoom": 0,
			"maxZoom": 16,
			"attribution": "© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
			"query_parameters": {
				"elastic_tile_service_tos": "agree",
				"my_app_name": "kibana",
				"license_uid": "{license_uid}"
			}
		},
		{
			"id": "road_map",
			"license": "trial",
			"url": "https://tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
			"minZoom": 0,
			"maxZoom": 18,
			"attribution": "© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
			"query_parameters": {
				"elastic_tile_service_tos": "agree",
				"my_app_name": "kibana",
				"license_uid": "{license_uid}"
			}
		},
		{
			"id": "dark_road_map",
			"license": "trial",
			"url": "https://dark.tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
			"minZoom": 0,
			"maxZoom": 16,
			"attribution": "© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
			"query_parameters": {
				"elastic_tile_service_tos": "agree",
				"my_app_name": "kibana",
				"license_uid": "{license_uid}"
			}
		}
	]
}`));
    }, 100);
  });


}
