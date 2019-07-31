/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { GIS_API_PATH, EMS_META_PATH, EMS_DATA_TMS_PATH, EMS_DATA_FILE_PATH } from '../common/constants';
import _ from 'lodash';
import { getEMSResources } from '../common/ems_util';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { EMSClient } from 'ui/vis/map/ems_client';
import { xpackInfo } from './kibana_services';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

let emsSources = null;
let loadingMetaPromise = null;

export async function getEMSDataSources() {
  if (emsSources) {
    return emsSources;
  }

  if (loadingMetaPromise) {
    return loadingMetaPromise;
  }

  loadingMetaPromise = new Promise(async (resolve, reject) => {
    try {
      const proxyElasticMapsServiceInMaps = chrome.getInjected('proxyElasticMapsServiceInMaps', false);
      if (proxyElasticMapsServiceInMaps) {
        const fullResponse = await fetch(`${GIS_API_RELATIVE}/${EMS_META_PATH}`);
        emsSources = await fullResponse.json();
      } else {
        const emsClient = new EMSClient({
          language: i18n.getLocale(),
          kbnVersion: chrome.getInjected('kbnPkgVersion'),
          manifestServiceUrl: chrome.getInjected('emsManifestServiceUrl'),
          landingPageUrl: chrome.getInjected('emsLandingPageUrl')
        });
        const isEmsEnabled = chrome.getInjected('isEmsEnabled', true);
        const xpackMapsFeature = xpackInfo.get('features.maps');
        const licenseId = xpackMapsFeature && xpackMapsFeature.maps && xpackMapsFeature.uid ? xpackMapsFeature.uid :  '';

        const emsResponse = await getEMSResources(emsClient, isEmsEnabled, licenseId, false);
        emsSources = {
          ems: {
            file: emsResponse.fileLayers,
            tms: emsResponse.tmsServices
          }
        };
      }
      resolve(emsSources);
    } catch (e) {
      reject(e);
    }
  });
  return loadingMetaPromise;
}

export async function getEmsVectorFilesMeta() {
  const dataSource = await getEMSDataSources();
  return _.get(dataSource, 'ems.file', []);
}

export function getKibanaRegionList() {
  return chrome.getInjected('regionmapLayers');
}

export function getKibanaTileMap() {
  return chrome.getInjected('tilemap');
}


let emsClient = null;
let latestLicenseId = null;
export function getEMSClient() {
  if (!emsClient) {
    const isEmsEnabled = chrome.getInjected('isEmsEnabled', true);
    if (isEmsEnabled) {
      emsClient = new EMSClient({
        language: i18n.getLocale(),
        kbnVersion: chrome.getInjected('kbnPkgVersion'),
        manifestServiceUrl: chrome.getInjected('emsManifestServiceUrl'),
        landingPageUrl: chrome.getInjected('emsLandingPageUrl'),
        proxyElasticMapsServiceInMaps: false
      });
    } else {
      emsClient = {
        async getFileLayers() {
          return [];
        },
        async getTMSServices() {
          return [];
        },
        addQueryParams() {}
      };
    }
  }

  //add the license each time, so new
  const xpackMapsFeature = xpackInfo.get('features.maps');
  const licenseId = xpackMapsFeature && xpackMapsFeature.maps && xpackMapsFeature.uid ? xpackMapsFeature.uid :  '';
  if (latestLicenseId !== licenseId) {
    latestLicenseId = licenseId;
    emsClient.addQueryParams({ license: licenseId });
  }
  return emsClient;

}


export async function getTMSMetaFromTMSService(tmsService) {
  const proxyElasticMapsServiceInMaps = chrome.getInjected('proxyElasticMapsServiceInMaps', false);
  return {
    name: tmsService.getDisplayName(),
    origin: tmsService.getOrigin(),
    id: tmsService.getId(),
    minZoom: await tmsService.getMinZoom(),
    maxZoom: await tmsService.getMaxZoom(),
    attribution: tmsService.getHTMLAttribution(),
    attributionMarkdown: tmsService.getMarkdownAttribution(),
    // eslint-disable-next-line max-len
    url: proxyElasticMapsServiceInMaps ?   `../${GIS_API_PATH}/${EMS_DATA_TMS_PATH}?id=${encodeURIComponent(tmsService.getId())}&x={x}&y={y}&z={z}` : await tmsService.getUrlTemplate()
  };
}

export async function getUrlFromFileLayer(fileLayer) {
  const proxyElasticMapsServiceInMaps = chrome.getInjected('proxyElasticMapsServiceInMaps', false);
  // eslint-disable-next-line max-len
  return proxyElasticMapsServiceInMaps ? `../${GIS_API_PATH}/${EMS_DATA_FILE_PATH}?id=${encodeURIComponent(fileLayer.getId())}` : fileLayer.getDefaultFormatUrl();
}


