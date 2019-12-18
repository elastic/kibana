/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GIS_API_PATH, EMS_CATALOGUE_PATH, EMS_GLYPHS_PATH } from '../common/constants';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { EMSClient } from '@elastic/ems-client';
import { getLicenseId } from './kibana_services';
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
      const proxyElasticMapsServiceInMaps = chrome.getInjected(
        'proxyElasticMapsServiceInMaps',
        false
      );
      const proxyPath = proxyElasticMapsServiceInMaps ? relativeToAbsolute('..') : '';

      const manifestServiceUrl = proxyElasticMapsServiceInMaps
        ? relativeToAbsolute(`${GIS_API_RELATIVE}/${EMS_CATALOGUE_PATH}`)
        : chrome.getInjected('emsManifestServiceUrl');

      emsClient = new EMSClient({
        language: i18n.getLocale(),
        kbnVersion: chrome.getInjected('kbnPkgVersion'),
        manifestServiceUrl: manifestServiceUrl,
        landingPageUrl: chrome.getInjected('emsLandingPageUrl'),
        fetchFunction: fetchFunction, //import this from client-side, so the right instance is returned (bootstrapped from common/* would not work
        proxyPath: proxyPath,
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
        addQueryParams() {},
      };
    }
  }
  const licenseId = getLicenseId();
  if (latestLicenseId !== licenseId) {
    latestLicenseId = licenseId;
    emsClient.addQueryParams({ license: licenseId });
  }
  return emsClient;
}

export function getGlyphUrl() {
  if (!chrome.getInjected('isEmsEnabled', true)) {
    return '';
  }
  return chrome.getInjected('proxyElasticMapsServiceInMaps', false)
    ? relativeToAbsolute(`${GIS_API_RELATIVE}/${EMS_GLYPHS_PATH}`) + `/{fontstack}/{range}`
    : chrome.getInjected('emsFontLibraryUrl', true);
}

export function isRetina() {
  return window.devicePixelRatio === 2;
}
