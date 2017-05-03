import { uiModules } from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
import { modifyUrl } from 'ui/url';
marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

uiModules.get('kibana')
  .service('serviceSettings', function ($http, $sanitize, mapConfig, kbnVersion) {

    const extendUrl = (url, props) => (
      modifyUrl(url, parsed => _.merge(parsed, props))
    );

    /**
     *  Unescape a url template that was escaped by encodeURI() so leaflet
     *  will be able to correctly locate the varables in the template
     *  @param  {String} url
     *  @return {String}
     */
    // const unescapeTemplateVars = url => {
    //   const ENCODED_TEMPLATE_VARS_RE = /%7B(\w+?)%7D/g;
    //   return url.replace(ENCODED_TEMPLATE_VARS_RE, (total, varName) => `{${varName}}`);
    // };


    /**
     * POC, need to remove duplicates with tilemap_settings
     */
    class ServiceSettings {

      constructor() {
        this._queryParams = {
          my_app_version: kbnVersion
        };

        this._catalogueError = null;
        this._catalogue = null;

        this._tmsServices = null;
        this._geoLayers = null;

        this._loadCatalogue = null;
        this._loadGeoLayers = null;
        this._loadTMSServices = null;

        this._invalidateSettings();
      }

      _invalidateSettings() {

        this._loadCatalogue = _.once(async() => {
          try {
            const response = await this._getManifest(mapConfig.manifestServiceUrl, this._queryParams);
            this._catalogue = response.data;
            this._catalogueError = null;
            return this._catalogue;
          } catch (e) {
            if (!e) {
              e = new Error('Unkown error');
            }
            if (!(e instanceof Error)) {
              e = new Error(e.data || `status ${e.statusText || e.status}`);
            }
            this._catalogue = null;
            this._catalogueError = new Error(`Could not retrieve manifest from the tile service: ${e.message}`);

            //todo: handle this better;
            throw this._catalogueError;
          }
        });


        this._loadFileLayers = _.once(async() => {
          const catalogue = await this._loadCatalogue();
          const fileService = catalogue.services.filter((service) => service.type === 'file')[0];
          const response = await this._getManifest(fileService.manifest, this._queryParams);
          const layers = response.data.layers.filter(layer => layer.format === 'geojson');

          //todo. add query-params to all layer-urls
          return layers;
        });

        this._loadTMSServices = _.once(async() => {


          const catalogue = await this._loadCatalogue();

          const tmsService = catalogue.services.filter((service) => service.type === 'tms')[0];

          const response = await this._getManifest(tmsService.manifest, this._queryParams);
          const services = response.data.services;

          //todo. add query-params to all layer-urls
          return services[0];
        });

      }

      async _getManifest(manifestUrl) {
        return $http({
          url: extendUrl(manifestUrl, { query: this._queryParams }),
          method: 'GET'
        });
      }


      async getFileLayers() {
        const fileLayers = await this._loadFileLayers();
        return fileLayers;
      }

      async getTMSService() {
        const service = await this._loadTMSServices();

        //todo: shim this for now
        return {
          getUrl: function () {
            return service.url;
          },
          getMinMaxZoom: function (isWMSEnabled) {
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
              minZoom: this.minZoom,
              maxZoom: this.maxZoom
            };
          },
          getTMSOptions: function () {
            return service;
          }
        };
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


// async function mockRequest() {
//
//   return new Promise(function (resolve) {
//     setTimeout(function () {
//
//       const ret = `{
//         "layers":[
//         {
//           "attribution":"",
//           "name":"US States",
//           "url":"https://storage.googleapis.com/elastic-layer.appspot.com/L2FwcGhvc3RpbmdfcHJvZC9ibG9icy9BRW5CMlVvNGJ0aVNidFNJR2dEQl9rbTBjeXhKMU01WjRBeW1kN3JMXzM2Ry1qc3F6QjF4WE5XdHY2ODlnQkRpZFdCY2g1T2dqUGRHSFhSRTU3amlxTVFwZjNBSFhycEFwV2lYR29vTENjZjh1QTZaZnRpaHBzby5VXzZoNk1paGJYSkNPalpI",
//           "fields":[
//             {
//               "name":"postal",
//               "description":"Two letter abbreviation"
//             },
//             {
//               "name":"name",
//               "description":"State name"
//             }
//           ],
//           "created_at":"2017-04-26T19:45:22.377820",
//           "id":5086441721823232
//         },
//         {
//           "attribution":"\u00a9 [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
//           "name":"World Countries",
//           "url":"https://storage.googleapis.com/elastic-layer.appspot.com/L2FwcGhvc3RpbmdfcHJvZC9ibG9icy9BRW5CMlVwWTZTWnhRRzNmUk9HUE93TENjLXNVd2IwdVNpc09SRXRyRzBVWWdqOU5qY2hldGJLOFNZSFpUMmZmZWdNZGx0NWprT1R1ZkZ0U1JEdFBtRnkwUWo0S0JuLTVYY1I5RFdSMVZ5alBIZkZuME1qVS04TS5oQTRNTl9yRUJCWk9tMk03",
//           "fields":[
//             {
//               "name":"iso2",
//               "description":"Two letter abbreviation"
//             },
//             {
//               "name":"name",
//               "description":"Country name"
//             },
//             {
//               "name":"iso3",
//               "description":"Three letter abbreviation"
//             }
//           ],
//           "created_at":"2017-04-26T17:12:15.978370",
//           "id":5659313586569216
//         }
//       ]
//       }`;
//
//       resolve(JSON.parse(ret));
//     }, 100);
//   });
//
//
// }
