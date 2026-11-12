/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const ES_ARCHIVE_FLIGHTS =
  'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights';
const KBN_ARCHIVE_FLIGHTS =
  'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern';
const ES_ARCHIVE_LONG_WINDOW_LOGSTASH =
  'src/platform/test/functional/fixtures/es_archiver/long_window_logstash';
const KBN_ARCHIVE_LONG_WINDOW_LOGSTASH =
  'src/platform/test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern';
// Map with a flights layer, a long-window-logstash layer and an `@message: exists` global filter.
// The filter field only exists in long-window-logstash.
const KBN_ARCHIVE_MAP =
  'x-pack/platform/plugins/shared/maps/test/scout/ui/fixtures/kbn_archives/multiple_data_views.json';
const MAP_ID = 'd6827af4-baf9-4697-a472-d0f29d946768';

const FLIGHTS_DATA_VIEW = 'kibana_sample_data_flights';
const LOGSTASH_DATA_VIEW = 'long-window-logstash-*';

const LOCAL_TIMEOUT = { timeout: 20_000 };

test.describe('Maps - multiple data views', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_FLIGHTS);
    await kbnClient.importExport.load(KBN_ARCHIVE_FLIGHTS);
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LONG_WINDOW_LOGSTASH);
    await kbnClient.importExport.load(KBN_ARCHIVE_LONG_WINDOW_LOGSTASH);
    await kbnClient.importExport.load(KBN_ARCHIVE_MAP);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient, uiSettings }) => {
    await uiSettings.unset(UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX);
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('ignores global filters on layers using a data view without the filter field by default', async ({
    pageObjects,
    uiSettings,
  }) => {
    const { maps } = pageObjects;
    await uiSettings.set({ [UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX]: true });
    await maps.openMapWithId(MAP_ID);

    await expect
      .poll(() => maps.getLayerTocTooltipMsg(FLIGHTS_DATA_VIEW), LOCAL_TIMEOUT)
      .toBe(
        'kibana_sample_data_flights\nFound 9 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );
    await expect
      .poll(() => maps.getLayerTocTooltipMsg(LOGSTASH_DATA_VIEW), LOCAL_TIMEOUT)
      .toBe(
        'long-window-logstash-*\nFound 2 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );
  });

  test('applies global filters on layers using a data view without the filter field', async ({
    pageObjects,
    uiSettings,
  }) => {
    const { maps } = pageObjects;
    await uiSettings.set({ [UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX]: false });
    await maps.openMapWithId(MAP_ID);

    await expect
      .poll(() => maps.getLayerTocTooltipMsg(FLIGHTS_DATA_VIEW), LOCAL_TIMEOUT)
      .toBe(
        'kibana_sample_data_flights\nNo results found.\nResults narrowed by global search\nResults narrowed by global time'
      );
    await expect
      .poll(() => maps.getLayerTocTooltipMsg(LOGSTASH_DATA_VIEW), LOCAL_TIMEOUT)
      .toBe(
        'long-window-logstash-*\nFound 2 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );
  });
});
