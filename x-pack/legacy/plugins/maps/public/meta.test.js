/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEMSClient
} from './meta';


jest.mock('ui/chrome',
  () => ({
    getBasePath: () => {
      return '<basepath>';
    },
    getInjected(key) {
      if (key === 'proxyElasticMapsServiceInMaps') {
        return false;
      } else if (key === 'isEmsEnabled') {
        return true;
      }
    },
    getUiSettingsClient: () => {
      return {
        get: () => {
          return '';
        }
      };
    },
  })
);

jest.mock('ui/vis/map/ems_client', () => {
  const module =  require('ui/vis/__tests__/map/ems_client_util.js');
  function EMSClient() {
    return module.getEMSClient();
  }
  return {
    EMSClient: EMSClient
  };
});

jest.mock('./kibana_services', () => {
  return {
    xpackInfo: {
      get() {
        return 'foobarlicenseid';
      }
    }
  };
});

describe('default use without proxy', () => {

  it('should return absolute urls', async () => {

    const emsClient = getEMSClient();
    const tmsServices = await emsClient.getTMSServices();

    const rasterUrl = await tmsServices[0].getUrlTemplate();
    expect(rasterUrl.startsWith('https://raster-style.foobar')).toBe(true);

    const fileLayers = await emsClient.getFileLayers();
    const file1Url = fileLayers[0].getDefaultFormatUrl();

    expect(file1Url.startsWith('https://vector-staging.maps.elastic.co/files')).toBe(true);

    const file2Url = fileLayers[1].getDefaultFormatUrl();
    expect(file2Url.startsWith('https://vector-staging.maps.elastic.co/files')).toBe(true);
  });
});
