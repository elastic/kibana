/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import {
  GIS_API_PATH,
  EMS_CATALOGUE_PATH
} from '../common/constants';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { EMSClient } from 'ui/vis/map/ems_client';
import { xpackInfo } from './kibana_services';
import fetch from 'node-fetch';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

export function getKibanaRegionList() {
  return chrome.getInjected('regionmapLayers');
}

export function getKibanaTileMap() {
  return chrome.getInjected('tilemap');
}

function relativeToAbsolute(url) {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}


function fetchFunction(...args) {
  return fetch(...args);
}

let emsClient = null;
let latestLicenseId = null;
export function getEMSClient() {
  if (!emsClient) {
    const isEmsEnabled = chrome.getInjected('isEmsEnabled', true);
    if (isEmsEnabled) {

      const proxyElasticMapsServiceInMaps = chrome.getInjected('proxyElasticMapsServiceInMaps', false);
      const proxyPath = proxyElasticMapsServiceInMaps ? relativeToAbsolute('..') : '';
      // eslint-disable-next-line max-len
      const manifestServiceUrl = proxyElasticMapsServiceInMaps ? relativeToAbsolute(`${GIS_API_RELATIVE}/${EMS_CATALOGUE_PATH}`) : chrome.getInjected('emsManifestServiceUrl');

      emsClient = new EMSClient({
        language: i18n.getLocale(),
        kbnVersion: chrome.getInjected('kbnPkgVersion'),
        manifestServiceUrl: manifestServiceUrl,
        landingPageUrl: chrome.getInjected('emsLandingPageUrl'),
        fetchFunction: fetchFunction, //import this from client-side, so the right instance is returned (bootstrapped from common/* would not work
        proxyPath: proxyPath
      });
    } else {
      //EMS is turned off. Mock API.
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
  const xpackMapsFeature = xpackInfo.get('features.maps');
  const licenseId = xpackMapsFeature && xpackMapsFeature.maps && xpackMapsFeature.uid ? xpackMapsFeature.uid :  '';
  if (latestLicenseId !== licenseId) {
    latestLicenseId = licenseId;
    emsClient.addQueryParams({ license: licenseId });
  }
  return emsClient;

}
