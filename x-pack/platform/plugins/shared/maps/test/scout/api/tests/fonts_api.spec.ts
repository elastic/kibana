/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { copyFile, rm } from 'fs/promises';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - fonts', { tag: testData.MAPS_API_TAGS }, () => {
  let cookieHeader: Record<string, string>;

  const fontPath = path.join(
    process.cwd().replace(/x-pack.*$/, ''),
    'x-pack/platform/plugins/shared/maps/server/fonts/open_sans/0-255.pbf'
  );
  const destinationPath = path.join(path.dirname(fontPath), '..', path.basename(fontPath));

  apiTest.beforeAll(async ({ samlAuth, esArchiver, kbnClient, log }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logstashFunctional);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.maps);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.mapsData);

    log.serviceLoaded(`Copying test file from '${fontPath}' to '${destinationPath}'`);
    await copyFile(fontPath, destinationPath);
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    log.serviceLoaded(`Removing test file '${destinationPath}'`);
    await rm(destinationPath);
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.maps);
  });

  apiTest('should return fonts', async ({ apiClient }) => {
    const response = await apiClient.get(
      'internal/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/0-255',
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'buffer',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.length).toBe(74696);
  });

  apiTest('should return 404 when file not found', async ({ apiClient }) => {
    const response = await apiClient.get(
      'internal/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/noGonaFindMe',
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      }
    );

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should return 404 when file is not in font folder (..)', async ({ apiClient }) => {
    const response = await apiClient.get('internal/maps/fonts/open_sans/..%2f0-255', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should return 404 when file is not in font folder (./..)', async ({ apiClient }) => {
    const response = await apiClient.get('internal/maps/fonts/open_sans/.%2f..%2f0-255', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(404);
  });
});
