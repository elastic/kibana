/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { uiModules } from '../../modules';
import _ from 'lodash';
import MarkdownIt from 'markdown-it';
import { ORIGIN } from '../../../../legacy/core_plugins/tile_map/common/origin';
import { EMSClientV66 } from '../../../../legacy/core_plugins/tile_map/common/ems_client';
import { i18n } from '@kbn/i18n';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

const TMS_IN_YML_ID = 'TMS in config/kibana.yml';

uiModules.get('kibana')
  .service('serviceSettings', function ($http, $sanitize, mapConfig, tilemapsConfig, kbnVersion) {

    const attributionFromConfig = $sanitize(markdownIt.render(tilemapsConfig.deprecated.config.options.attribution || ''));
    const tmsOptionsFromConfig = _.assign({}, tilemapsConfig.deprecated.config.options, { attribution: attributionFromConfig });

    class ServiceSettings {

      constructor() {

        this._showZoomMessage = true;

        this._emsClient = new EMSClientV66({
          language: i18n.getLocale(),
          kbnVersion: kbnVersion,
          manifestServiceUrl: mapConfig.manifestServiceUrl,
          htmlSanitizer: $sanitize,
          landingPageUrl: mapConfig.emsLandingPageUrl
        });

      }

      shouldShowZoomMessage({ origin }) {
        return origin === ORIGIN.EMS && this._showZoomMessage;
      }

      disableZoomMessage() {
        this._showZoomMessage = false;
      }

      __debugStubManifestCalls(manifestRetrieval) {
        const oldGetManifest = this._emsClient._getManifest;
        this._emsClient._getManifest = manifestRetrieval;
        return {
          removeStub: () => {
            delete this._emsClient._getManifest;
            //not strictly necessary since this is prototype method
            if (this._emsClient._getManifest !== oldGetManifest) {
              this._emsClient._getManifest = oldGetManifest;
            }
          }
        };
      }

      async getFileLayers() {

        if (!mapConfig.includeElasticMapsService) {
          return [];
        }

        const fileLayers = await this._emsClient.getFileLayers();
        return fileLayers.map(fileLayer => {

          //backfill to older settings
          const format = fileLayer.getDefaultFormatType();
          const meta = fileLayer.getDefaultFormatMeta();

          return {
            name: fileLayer.getDisplayName(),
            origin: fileLayer.getOrigin(),
            id: fileLayer.getId(),
            created_at: fileLayer.getCreatedAt(),
            attribution: fileLayer.getHTMLAttribution(),
            fields: fileLayer.getFieldsInLanguage(),
            format: format, //legacy: format and meta are split up
            meta: meta //legacy, format and meta are split up
          };
        });
      }


      /**
       * Returns all the services published by EMS (if configures)
       * It also includes the service configured in tilemap (override)
       */
      async getTMSServices() {

        let allServices = [];
        if (tilemapsConfig.deprecated.isOverridden) {//use tilemap.* settings from yml
          const tmsService = _.cloneDeep(tmsOptionsFromConfig);
          tmsService.id = TMS_IN_YML_ID;
          tmsService.origin = ORIGIN.KIBANA_YML;
          allServices.push(tmsService);
        }


        if  (mapConfig.includeElasticMapsService) {
          const servicesFromManifest = await this._emsClient.getTMSServices();
          const strippedServiceFromManifest = servicesFromManifest.map((service) => {
            //shim for compatibility
            const shim = {
              origin: service.getOrigin(),
              id: service.getId(),
              minZoom: service.getMinZoom(),
              maxZoom: service.getMaxZoom(),
              attribution: service.getHTMLAttribution()
            };
            return shim;
          });
          allServices = allServices.concat(strippedServiceFromManifest);
        }

        return allServices;
      }

      /**
       * Add optional query-parameters to all requests
       *
       * @param additionalQueryParams
       */
      addQueryParams(additionalQueryParams) {
        this._emsClient.addQueryParams(additionalQueryParams);
      }

      async getEMSHotLink(fileLayerConfig) {
        const fileLayers = await this._emsClient.getFileLayers();
        const layer = fileLayers.find(fileLayer => {
          const hasIdByName =  fileLayer.hasId(fileLayerConfig.name);//legacy
          const hasIdById =  fileLayer.hasId(fileLayerConfig.id);
          return hasIdByName || hasIdById;
        });
        return  (layer) ? layer.getEMSHotLink() : null;
      }


      async _getUrlTemplateForEMSTMSLayer(tmsServiceConfig) {
        const tmsServices = await this._emsClient.getTMSServices();
        const tmsService = tmsServices.find(service => {
          return service.getId() === tmsServiceConfig.id;
        });
        return tmsService.getUrlTemplate();
      }

      async getUrlTemplateForTMSLayer(tmsServiceConfig) {

        if (tmsServiceConfig.origin === ORIGIN.EMS) {
          return this._getUrlTemplateForEMSTMSLayer(tmsServiceConfig);
        } else if (tmsServiceConfig.origin === ORIGIN.KIBANA_YML) {
          return tilemapsConfig.deprecated.config.url;
        } else {
          //this is an older config. need to resolve this dynamically.
          if (tmsServiceConfig.id === TMS_IN_YML_ID) {
            return tilemapsConfig.deprecated.config.url;
          } else {
            //assume ems
            return this._getUrlTemplateForEMSTMSLayer(tmsServiceConfig);
          }
        }

      }

      async _getFileUrlFromEMS(fileLayerConfig) {
        const fileLayers = await this._emsClient.getFileLayers();
        const layer = fileLayers.find(fileLayer => {
          const hasIdByName =  fileLayer.hasId(fileLayerConfig.name);//legacy
          const hasIdById =  fileLayer.hasId(fileLayerConfig.id);
          return hasIdByName || hasIdById;
        });

        if (layer) {
          return layer.getDefaultFormatUrl();
        } else {
          throw new Error(`File  ${fileLayerConfig.name} not recognized`);
        }
      }

      async getUrlForRegionLayer(fileLayerConfig) {
        let url;
        if (fileLayerConfig.origin === ORIGIN.EMS) {
          url = this._getFileUrlFromEMS(fileLayerConfig);
        } else if (fileLayerConfig.layerId && fileLayerConfig.layerId.startsWith(`${ORIGIN.EMS}.`)) {
          //fallback for older saved objects
          url = this._getFileUrlFromEMS(fileLayerConfig);
        } else if (fileLayerConfig.layerId && fileLayerConfig.layerId.startsWith(`${ORIGIN.KIBANA_YML}.`)) {
          //fallback for older saved objects
          url = fileLayerConfig.url;
        } else {
          //generic fallback
          url = fileLayerConfig.url;
        }
        return url;
      }

      async getJsonForRegionLayer(fileLayerConfig) {
        const url = await this.getUrlForRegionLayer(fileLayerConfig);
        const json = await $http({
          url: url,
          method: 'GET'
        });
        return json.data;
      }

    }

    return new ServiceSettings();
  });
