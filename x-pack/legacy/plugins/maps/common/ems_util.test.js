/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import {
  getEMSResources
} from './ems_util';

// eslint-disable-next-line import/no-unresolved
import { getEMSClient } from 'ui/vis/__tests__/map/ems_client_util.js';

describe('ems util test', () => {


  it('Should get relative paths when using proxy', async () => {

    const emsClient = getEMSClient({});
    const isEmsEnabled = true;
    const licenseId = 'foobar';
    const useProxy = true;
    const resources = await getEMSResources(emsClient, isEmsEnabled, licenseId, useProxy);

    expect(resources.tmsServices[0].url.startsWith('../api/maps/ems/tms')).toBe(true);
    expect(resources.fileLayers[0].url.startsWith('../api/maps/ems/file')).toBe(true);
    expect(resources.fileLayers[1].url.startsWith('../api/maps/ems/file')).toBe(true);

  });


  it('Should get absolute paths when not using proxy', async () => {

    const emsClient = getEMSClient({});
    const isEmsEnabled = true;
    const licenseId = 'foobar';
    const useProxy = false;
    const resources = await getEMSResources(emsClient, isEmsEnabled, licenseId, useProxy);

    expect(resources.tmsServices[0].url.startsWith('https://raster-style.foobar/')).toBe(true);
    expect(resources.fileLayers[0].url.startsWith('https://vector-staging.maps.elastic.co/files')).toBe(true);
    expect(resources.fileLayers[1].url.startsWith('https://vector-staging.maps.elastic.co/files')).toBe(true);
  });

  it('Should get empty response when ems is disabled', async () => {

    const emsClient = getEMSClient({});
    const isEmsEnabled = false;
    const licenseId = 'foobar';
    const useProxy = true;
    const resources = await getEMSResources(emsClient, isEmsEnabled, licenseId, !useProxy);

    expect(resources.tmsServices.length).toBe(0);
    expect(resources.fileLayers.length).toBe(0);

  });


});
