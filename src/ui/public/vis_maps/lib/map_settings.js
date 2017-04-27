import { uiModules } from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
import { modifyUrl } from 'ui/url';
marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

uiModules.get('kibana')
  .service('mapSettings', function ($http, $sanitize, vectormapsConfig, kbnVersion) {

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
    class MapSettings {

      constructor() {

        this._queryParams = {
          my_app_version: kbnVersion
        };
        this._error = null;
        this._invalidateSettings();
      }


      _invalidateSettings() {

        this._settingsInitialized = false;
        this._response = null;
        this._loadSettings = _.once(async() => {

          if (this._settingsInitialized) {
            return true;
          }

          return this._getVectormapsManifest(vectormapsConfig.manifestServiceUrl, this._queryParams)
            .then(response => {
              this._response = response.data;

              // const service = _.get(response, 'data.services[0]');
              // if (!service) {
              //   throw new Error('Manifest response does not include sufficient service data.');
              // }
              //
              // this._error = null;
              // this._url = unescapeTemplateVars(extendUrl(service.url, {
              //   query: this._queryParams
              // }));

              this._error = null;
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

      getVectorLayers() {
        if (!this._settingsInitialized) {
          throw new Error('Should wait until vector layers are initialized');
        }

        return this._response.layers;
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
      _getVectormapsManifest(manifestUrl) {
        return $http({
          url: extendUrl(manifestUrl, { query: this._queryParams }),
          method: 'GET'
        });
        // return mockRequest();
      }

    }

    return new MapSettings();
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
