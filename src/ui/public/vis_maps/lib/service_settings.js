import { uiModules } from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
import { modifyUrl } from 'ui/url';
marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

uiModules.get('kibana')
  .service('serviceSettings', function ($http, $sanitize, mapConfig, tilemapsConfig, kbnVersion) {


    const attributionFromConfig = $sanitize(marked(tilemapsConfig.deprecated.config.options.attribution || ''));
    const tmsOptionsFromConfig = _.assign({}, tilemapsConfig.deprecated.config.options, { attribution: attributionFromConfig });

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



    class ServiceSettings {

      constructor() {
        this._queryParams = {
          my_app_version: kbnVersion
        };

        this._loadCatalogue = null;
        this._loadFileLayers = null;
        this._loadTMSServices = null;

        this._invalidateSettings();
      }
      _invalidateSettings() {

        this._loadCatalogue = _.once(async() => {
          try {
            const response = await this._getManifest(mapConfig.manifestServiceUrl, this._queryParams);
            return response.data;
          } catch (e) {
            if (!e) {
              e = new Error('Unkown error');
            }
            if (!(e instanceof Error)) {
              e = new Error(e.data || `status ${e.statusText || e.status}`);
            }
            throw new Error(`Could not retrieve manifest from the tile service: ${e.message}`);
          }
        });


        this._loadFileLayers = _.once(async() => {
          const catalogue = await this._loadCatalogue();
          const fileService = catalogue.services.filter((service) => service.type === 'file')[0];
          const manifest = await this._getManifest(fileService.manifest, this._queryParams);
          const layers = manifest.data.layers.filter(layer => layer.format === 'geojson');
          layers.forEach((layer) => {
            layer.url = this._extendUrlWithParams(layer.url);
          });
          return layers;
        });

        this._loadTMSServices = _.once(async() => {

          if (tilemapsConfig.deprecated.isOverridden) {//use settings from yml (which are overridden)
            const tmsService = _.cloneDeep(tmsOptionsFromConfig);
            tmsService.url = tilemapsConfig.deprecated.config.url;
            return tmsService;
          }

          const catalogue = await this._loadCatalogue();
          const tmsService = catalogue.services.filter((service) => service.type === 'tms')[0];
          const manifest = await this._getManifest(tmsService.manifest, this._queryParams);
          const services = manifest.data.services;

          const firstService = _.cloneDeep(services[0]);
          if (!firstService) {
            throw new Error('Manifest response does not include sufficient service data.');
          }


          firstService.attribution = $sanitize(marked(firstService.attribution));
          firstService.subdomains = firstService.subdomains || [];
          firstService.url = this._extendUrlWithParams(firstService.url);
          return firstService;
        });

      }

      _extendUrlWithParams(url) {
        return unescapeTemplateVars(extendUrl(url, {
          query: this._queryParams
        }));
      }

      async _getManifest(manifestUrl) {
        return $http({
          url: extendUrl(manifestUrl, { query: this._queryParams }),
          method: 'GET'
        });
      }


      async getFileLayers() {
        return await this._loadFileLayers();
      }

      async getTMSService() {

        const tmsService = await this._loadTMSServices();

        return {
          getUrl: function () {
            return tmsService.url;
          },
          getMinMaxZoom: (isWMSEnabled) => {
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
              minZoom: tmsService.minZoom,
              maxZoom: tmsService.maxZoom
            };
          },
          getTMSOptions: function () {
            return tmsService;
          }
        };
      }

      getFallbackZoomSettings(isWMSEnabled) {
        return (isWMSEnabled) ? { minZoom: 0, maxZoom: 18 } : { minZoom: 0, maxZoom: 10 };
      }

      /**
       * Add optional query-parameters to all requests
       *
       * @param additionalQueryParams
       */
      addQueryParams(additionalQueryParams) {
        for (const key in additionalQueryParams) {
          if (additionalQueryParams.hasOwnProperty(key)) {
            if (additionalQueryParams[key] !== this._queryParams[key]) {
              //changes detected.
              this._queryParams = _.assign({}, this._queryParams, additionalQueryParams);
              this._invalidateSettings();
              break;
            }
          }
        }
      }
    }

    return new ServiceSettings();
  });
