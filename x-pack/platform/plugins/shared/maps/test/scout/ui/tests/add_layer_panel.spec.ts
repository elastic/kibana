/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';

const INDEX_PATTERN = 'logstash-*';

test.describe(
  'Maps - add layer panel',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    test.beforeAll(async ({ kbnClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await kbnClient.importExport.load(KBN_ARCHIVE);
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('add layer panel', async ({ browserAuth, page, pageObjects }) => {
      const { maps } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await maps.gotoNewMap();
      await maps.openAddLayerFlyout();
      await maps.documentsItem.click();
      await maps.selectGeoIndexPatternLayer(INDEX_PATTERN);
      await maps.waitForLayersToLoad();

      await test.step('should show unsaved layer in layer TOC', async () => {
        await expect.poll(() => maps.doesLayerExist(INDEX_PATTERN)).toBe(true);
      });

      await test.step('should disable save button when map has unsaved changes', async () => {
        await expect.poll(() => maps.saveButton.isDisabled()).toBe(true);
      });

      await test.step('should remove layer on cancel', async () => {
        await page.testSubj.click('layerAddCancelButton');
        await expect.poll(() => maps.layerAddForm.isVisible()).toBe(false);
        await expect.poll(() => maps.doesLayerExist(INDEX_PATTERN)).toBe(false);
      });

      await test.step('should enable save button when map does not have unsaved changes', async () => {
        await expect.poll(() => maps.saveButton.isEnabled()).toBe(true);
      });
    });
  }
);
