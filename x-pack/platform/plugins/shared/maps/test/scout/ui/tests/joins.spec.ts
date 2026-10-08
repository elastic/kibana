/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';

const JOIN_PROPERTY_NAME = '__kbnjoin__max_of_prop1__855ccb86-fe42-11e8-8eb2-f2801f1b9fd1';
const EXPECTED_JOIN_VALUES: Record<string, number | undefined> = {
  alpha: 10,
  bravo: 3,
  charlie: 12,
  tango: undefined,
};

const VECTOR_SOURCE_ID = 'n1t6f';

test.describe(
  'Maps - layer with joins',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    test.beforeAll(async ({ kbnClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
      await kbnClient.importExport.load(KBN_ARCHIVE);
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('layer with joins', async ({ browserAuth, page, pageObjects }) => {
      const { maps } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await maps.openMapWithId('1649cc70-f736-11e8-8ce0-9723965e01e3');

      await test.step('should re-fetch join with refresh timer', async () => {
        const beforeTimestamp = await maps.getRequestTimestamp('load join metrics (geo_shapes*)');
        expect(beforeTimestamp).toHaveLength(24);
        await maps.triggerSingleRefresh(1000);
        await expect
          .poll(() => maps.getRequestTimestamp('load join metrics (geo_shapes*)'), {
            timeout: 30_000,
          })
          .not.toBe(beforeTimestamp);
      });

      await test.step('should show dynamic data range in legend', async () => {
        const layerTOCDetails = await maps.getLayerTOCDetails('geo_shapes*');
        const split = layerTOCDetails.trim().split('\n');

        expect(split[0]).toBe('max prop1');
        expect(split[1]).toBe('< 4.13');
        expect(split[2]).toBe('4.13 up to 5.25');
        expect(split[3]).toBe('5.25 up to 6.38');
        expect(split[4]).toBe('6.38 up to 7.5');
        expect(split[5]).toBe('7.5 up to 8.63');
        expect(split[6]).toBe('8.63 up to 9.75');
        expect(split[7]).toBe('9.75 up to 11');
        expect(split[8]).toBe('>= 11');
      });

      await test.step('should decorate feature properties with join property', async () => {
        const mapboxStyle = await maps.getMapboxStyle();
        expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features).toHaveLength(8);

        mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.forEach(
          ({ properties }: { properties: Record<string, unknown> }) => {
            if (properties.name === 'tango') {
              expect(Object.hasOwn(properties, JOIN_PROPERTY_NAME)).toBe(false);
            } else {
              expect(Object.hasOwn(properties, JOIN_PROPERTY_NAME)).toBe(true);
            }
            expect(properties[JOIN_PROPERTY_NAME]).toBe(
              EXPECTED_JOIN_VALUES[properties.name as string]
            );
          }
        );
      });

      await test.step('should flag only the joined features as visible', async () => {
        const mapboxStyle = await maps.getMapboxStyle();
        const vectorSource = mapboxStyle.sources[VECTOR_SOURCE_ID];

        const visibilitiesOfFeatures = vectorSource.data.features.map(
          (feature: { properties: Record<string, unknown> }) =>
            feature.properties.__kbn_isvisibleduetojoin__
        );

        expect(visibilitiesOfFeatures).toEqual([
          false,
          true,
          true,
          true,
          // geo centroids for above features
          false,
          true,
          true,
          true,
        ]);
      });

      await test.step('should not apply query to source and apply query to join', async () => {
        await maps.setAndSubmitQuery('prop1 < 10');
        await expect
          .poll(
            async () => {
              const { rawResponse } = await maps.getResponse('load join metrics (geo_shapes*)');
              return rawResponse.aggregations.join.buckets.length;
            },
            { timeout: 30_000 }
          )
          .toBe(2);
        await maps.setAndSubmitQuery('');
      });

      await test.step('where clause', async () => {
        await maps.openLayerPanel('geo_shapes*');
        await maps.setJoinWhereQuery('geo_shapes*', 'prop1 >= 11');

        await expect
          .poll(
            async () => {
              const { rawResponse } = await maps.getResponse('load join metrics (geo_shapes*)');
              return rawResponse.aggregations.join.buckets.length;
            },
            { timeout: 30_000 }
          )
          .toBe(1);

        const layerTOCDetails = await maps.getLayerTOCDetails('geo_shapes*');
        const split = layerTOCDetails.trim().split('\n');
        expect(split[0]).toBe('max prop1');
        expect(split[1]).toBe('12');

        const mapboxStyle = await maps.getMapboxStyle();
        const vectorSource = mapboxStyle.sources[VECTOR_SOURCE_ID];
        const visibilitiesOfFeatures = vectorSource.data.features.map(
          (feature: { properties: Record<string, unknown> }) =>
            feature.properties.__kbn_isvisibleduetojoin__
        );
        expect(visibilitiesOfFeatures).toEqual([
          false,
          true,
          false,
          false,
          // geo centroids for above features
          false,
          true,
          false,
          false,
        ]);

        await maps.closeLayerPanel();
      });

      await test.step('should not contain any elasticsearch request after layer is deleted', async () => {
        await maps.removeLayer('geo_shapes*');
        await expect
          .poll(() => maps.doesInspectorHaveRequests(), { timeout: 30_000 })
          .toBe(true);
      });

    });
  }
);
