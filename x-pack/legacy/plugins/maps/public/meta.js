/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { GIS_API_PATH, EMS_DATA_TMS_PATH, EMS_DATA_FILE_PATH } from '../common/constants';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { EMSClient } from 'ui/vis/map/ems_client';
import { xpackInfo } from './kibana_services';


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

export async function getUrlFromFileLayer(fileLayer) {
  const proxyElasticMapsServiceInMaps = chrome.getInjected('proxyElasticMapsServiceInMaps', false);
  // eslint-disable-next-line max-len
  return proxyElasticMapsServiceInMaps ? `../${GIS_API_PATH}/${EMS_DATA_FILE_PATH}?id=${encodeURIComponent(fileLayer.getId())}` : fileLayer.getDefaultFormatUrl();
}

export async function getURLFromTMSService(tmsService) {
  const proxyElasticMapsServiceInMaps = chrome.getInjected('proxyElasticMapsServiceInMaps', false);
  // eslint-disable-next-line max-len
  return proxyElasticMapsServiceInMaps ?  `../${GIS_API_PATH}/${EMS_DATA_TMS_PATH}?id=${encodeURIComponent(tmsService.getId())}&x={x}&y={y}&z={z}` : await tmsService.getUrlTemplate();
}

