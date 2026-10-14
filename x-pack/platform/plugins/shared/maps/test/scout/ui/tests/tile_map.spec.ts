/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';

test.describe('Maps - legacy tile_map visualization', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    await kbnClient.importExport.load(KBN_ARCHIVE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should render tile_map with map embeddable', async ({ browserAuth, pageObjects }) => {
    const { maps, visualize } = pageObjects;

    await browserAuth.loginAsPrivilegedUser();
    await visualize.goto();
    await visualize.clickSavedVisualization('Visualization TileMap');
    await maps.waitForLayersToLoad();

    expect(await maps.getNumberOfLayers()).toBe(2);
    expect(await maps.doesLayerExist('Visualization TileMap')).toBe(true);
  });
});
