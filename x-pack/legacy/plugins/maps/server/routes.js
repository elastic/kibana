/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import {
  EMS_CATALOGUE_PATH,
  EMS_FILES_CATALOGUE_PATH,
  EMS_FILES_DEFAULT_JSON_PATH,
  EMS_TILES_CATALOGUE_PATH,
  EMS_TILES_RASTER_STYLE_PATH,
  EMS_TILES_RASTER_TILE_PATH,
  GIS_API_PATH
} from '../common/constants';
import fetch from 'node-fetch';
import { i18n } from '@kbn/i18n';

import Boom from 'boom';

const ROOT = `/${GIS_API_PATH}`;

export function initRoutes(server, licenseUid) {

  const serverConfig = server.config();
  const mapConfig = serverConfig.get('map');

  let emsClient;
  if (mapConfig.includeElasticMapsService) {
    emsClient = new server.plugins.tile_map.EMSClient({
      language: i18n.getLocale(),
      kbnVersion: serverConfig.get('pkg.version'),
      manifestServiceUrl: mapConfig.manifestServiceUrl,
      landingPageUrl: mapConfig.emsLandingPageUrl,
      proxyElasticMapsServiceInMaps: false
    });
    emsClient.addQueryParams({ license: licenseUid });
  } else {
    emsClient = {
      async getFileLayers() {
        return [];
      },
      async getTMSServices() {
        return [];
      },
      async getMainManifest() {
        return null;
      },
      async getDefaultFileManifest() {
        return null;
      },
      async getDefaultTMSManifest() {
        return null;
      },
      addQueryParams() {}
    };
  }

  server.route({
    method: 'GET',
    path: `${ROOT}/${EMS_FILES_DEFAULT_JSON_PATH}`,
    handler: async (request) => {

      checkEMSProxyConfig();

      if (!request.query.id) {
        server.log('warning', 'Must supply id parameters to retrieve EMS file');
        return null;
      }

      const fileLayers = await emsClient.getFileLayers();
      const layer = fileLayers.find(layer => layer.getId() === request.query.id);
      if (!layer) {
        return null;
      }

      try {
        const file = await fetch(layer.getDefaultFormatUrl());
        return await file.json();
      } catch(e) {
        server.log('warning', `Cannot connect to EMS for file, error: ${e.message}`);
        throw Boom.badRequest(`Cannot connect to EMS`);
      }

    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/${EMS_TILES_RASTER_TILE_PATH}`,
    handler: async (request, h) => {

      checkEMSProxyConfig();

      if (!request.query.id ||
        typeof parseInt(request.query.x, 10) !== 'number' ||
        typeof parseInt(request.query.y, 10) !== 'number' ||
        typeof parseInt(request.query.z, 10) !== 'number'
      ) {
        server.log('warning', 'Must supply id/x/y/z parameters to retrieve EMS tile');
        return null;
      }

      const tmsServices = await emsClient.getTMSServices();
      const tmsService = tmsServices.find(layer => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;}

      const urlTemplate = await tmsService.getUrlTemplate();
      const url = urlTemplate
        .replace('{x}', request.query.x)
        .replace('{y}', request.query.y)
        .replace('{z}', request.query.z);

      try {
        const tile = await fetch(url);
        const arrayBuffer = await tile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let response = h.response(buffer);
        response = response.bytes(buffer.length);
        response = response.header('Content-Disposition', 'inline');
        response = response.header('Content-type', 'image/png');
        response = response.encoding('binary');
        return response;
      } catch(e) {
        server.log('warning', `Cannot connect to EMS for tile, error: ${e.message}`);
        throw Boom.badRequest(`Cannot connect to EMS`);
      }
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/${EMS_CATALOGUE_PATH}`,
    handler: async () => {

      checkEMSProxyConfig();

      const main =  await emsClient.getMainManifest();
      const proxiedManifest = {
        services: []
      };

      //rewrite the urls to the submanifest
      const tileService = main.services.find(service => service.id === 'tiles');
      const fileService = main.services.find(service => service.id === 'geo_layers');
      if (tileService) {
        proxiedManifest.services.push({
          ...tileService,
          manifest: `${GIS_API_PATH}/${EMS_TILES_CATALOGUE_PATH}`
        });
      }
      if (fileService) {
        proxiedManifest.services.push({
          ...fileService,
          manifest: `${GIS_API_PATH}/${EMS_FILES_CATALOGUE_PATH}`
        });
      }
      return proxiedManifest;
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/${EMS_FILES_CATALOGUE_PATH}`,
    handler: async () => {

      checkEMSProxyConfig();

      const file = await emsClient.getDefaultFileManifest();
      const layers = file.layers.map(layer => {
        const newLayer = { ...layer };
        const id = encodeURIComponent(layer.layer_id);
        const newUrl = `${GIS_API_PATH}/${EMS_FILES_DEFAULT_JSON_PATH}?id=${id}`;
        newLayer.formats = [{
          ...layer.formats[0],
          url: newUrl
        }];
        return newLayer;
      });
      //rewrite
      return { layers };
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/${EMS_TILES_CATALOGUE_PATH}`,
    handler: async () => {

      checkEMSProxyConfig();

      const tilesManifest =  await emsClient.getDefaultTMSManifest();
      const newServices = tilesManifest.services.map((service) => {
        const newService = {
          ...service
        };
        const rasterFormats = service.formats.filter(format => format.format === 'raster');
        newService.formats = [];
        if (rasterFormats.length) {
          const newUrl = `${GIS_API_PATH}/${EMS_TILES_RASTER_STYLE_PATH}?id=${service.id}`;
          newService.formats.push({
            ...rasterFormats[0],
            url: newUrl
          });
        }
        return newService;
      });

      return {
        services: newServices
      };
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/${EMS_TILES_RASTER_STYLE_PATH}`,
    handler: async (request) => {

      checkEMSProxyConfig();

      if (!request.query.id) {
        server.log('warning', 'Must supply id parameter to retrieve EMS raster style');
        return null;
      }

      const tmsServices = await emsClient.getTMSServices();
      const tmsService = tmsServices.find(layer => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;
      }
      const style = await tmsService.getDefaultRasterStyle();

      const newUrl = `${GIS_API_PATH}/${EMS_TILES_RASTER_TILE_PATH}?id=${request.query.id}&x={x}&y={y}&z={z}`;
      return {
        ...style,
        tiles: [newUrl]
      };
    }
  });


  function checkEMSProxyConfig() {
    if (!mapConfig.proxyElasticMapsServiceInMaps) {
      server.log('warning', `Cannot load content from EMS when map.proxyElasticMapsServiceInMaps is turned off`);
      throw Boom.notFound();
    }
  }

  server.route({
    method: 'GET',
    path: `${ROOT}/indexCount`,
    handler: async (request, h) => {
      const { server, query } = request;

      if (!query.index) {
        return h.response().code(400);
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      try {
        const { count } = await callWithRequest(request, 'count', { index: query.index });
        return { count };
      } catch (error) {
        return h.response().code(400);
      }
    }
  });
}
