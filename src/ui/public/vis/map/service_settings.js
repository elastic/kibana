import { uiModules } from '../../modules';
import _ from 'lodash';
import MarkdownIt from 'markdown-it';
import { modifyUrl } from '../../url';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

uiModules.get('kibana')
  .service('serviceSettings', function ($http, $sanitize, mapConfig, tilemapsConfig, kbnVersion) {

    const attributionFromConfig = $sanitize(markdownIt.render(tilemapsConfig.deprecated.config.options.attribution || ''));
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

        this._loadCatalogue = _.once(async () => {

          if (!mapConfig.includeElasticMapsService) {
            return { services: [] };
          }

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


        this._loadFileLayers = _.once(async () => {
          const catalogue = await this._loadCatalogue();

          const fileService = catalogue.services.find(service => service.type === 'file');
          if (!fileService) {
            return [];
          }

          const manifest = await this._getManifest(fileService.manifest, this._queryParams);
          const layers = manifest.data.layers.filter(layer => layer.format === 'geojson' || layer.format === 'topojson');
          layers.forEach((layer) => {
            layer.url = this._extendUrlWithParams(layer.url);
            layer.attribution = $sanitize(markdownIt.render(layer.attribution));
          });
          return layers;
        });

        this._loadTMSServices = _.once(async () => {

          const catalogue = await this._loadCatalogue();
          const tmsService = catalogue.services.find((service) => service.type === 'tms');
          if (!tmsService) {
            return [];
          }
          const tmsManifest = await this._getManifest(tmsService.manifest, this._queryParams);
          const preppedTMSServices = tmsManifest.data.services.map((tmsService) => {
            const preppedService = _.cloneDeep(tmsService);
            preppedService.attribution = $sanitize(markdownIt.render(preppedService.attribution));
            preppedService.subdomains = preppedService.subdomains || [];
            preppedService.url = this._extendUrlWithParams(preppedService.url);
            return preppedService;
          });

          return preppedTMSServices;

        });

      }

      _extendUrlWithParams(url) {
        return unescapeTemplateVars(extendUrl(url, {
          query: this._queryParams
        }));
      }

      /**
       * this internal method is overridden by the tests to simulate custom manifest.
       */
      async _getManifest(manifestUrl) {
        return $http({
          url: extendUrl(manifestUrl, { query: this._queryParams }),
          method: 'GET'
        });
      }


      async getFileLayers() {
        return await this._loadFileLayers();
      }


      /**
       * Returns all the services published by EMS (if configures)
       * It also includes the service configured in tilemap (override)
       */
      async getTMSServices() {

        const allServices = [];
        if (tilemapsConfig.deprecated.isOverridden) {//use tilemap.* settings from yml
          const tmsService = _.cloneDeep(tmsOptionsFromConfig);
          tmsService.url = tilemapsConfig.deprecated.config.url;
          tmsService.id = 'TMS in config/kibana.yml';
          allServices.push(tmsService);
        }

        const servicesFromManifest = await this._loadTMSServices();
        return allServices.concat(servicesFromManifest);

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
