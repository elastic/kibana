/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { getTileUrlParams } from '@kbn/maps-vector-tile-utils';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';
import { findFeature } from '../helpers/find_feature';

apiTest.describe('Maps - getTile', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  const defaultParams = {
    geometryFieldName: 'geo.coordinates',
    hasLabels: false,
    index: 'logstash-*',
    requestBody: {
      fields: ['bytes', 'machine.os.raw', { field: '@timestamp', format: 'epoch_millis' }],
      query: {
        bool: {
          filter: [
            { match_all: {} },
            {
              range: {
                '@timestamp': {
                  format: 'strict_date_optional_time',
                  gte: '2015-09-20T00:00:00.000Z',
                  lte: '2015-09-20T01:00:00.000Z',
                },
              },
            },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      },
      runtime_mappings: {
        hour_of_day: {
          script: {
            source: "// !@#$%^&*()_+ %%%\nemit(doc['timestamp'].value.getHour());",
          },
          type: 'long',
        },
      },
      size: 10000,
    },
  };

  apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logstashFunctional);
  });

  apiTest(
    'should return ES vector tile containing documents and metadata',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        `internal/maps/mvt/getTile/2/1/1.pbf?${getTileUrlParams(defaultParams)}`,
        {
          headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'buffer',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.headers['content-disposition']).toBe('inline');
      expect(response.headers['content-type']).toBe('application/x-protobuf');
      expect(response.headers['cache-control']).toBe('public, max-age=3600');

      const jsonTile = new VectorTile(new Protobuf(response.body));
      const layer = jsonTile.layers.hits;
      expect(layer).toHaveLength(2);

      const feature = findFeature(layer, (feat: any) => {
        return feat.properties._id === 'AU_x3_BsGFA8no6Qjjug';
      });
      expect(feature).toBeDefined();
      expect(feature.type).toBe(1);
      expect(feature.extent).toBe(4096);
      expect(feature.id).toBeUndefined();
      expect(feature.properties).toStrictEqual({
        '@timestamp': '1442709961071',
        _id: 'AU_x3_BsGFA8no6Qjjug',
        _index: 'logstash-2015.09.20',
        bytes: 9252,
        'machine.os.raw': 'ios',
      });
      expect(feature.loadGeometry()).toStrictEqual([[{ x: 44, y: 2382 }]]);

      const metaDataLayer = jsonTile.layers.meta;
      const metadataFeature = metaDataLayer.feature(0);
      expect(metadataFeature).toBeDefined();
      expect(metadataFeature.type).toBe(3);
      expect(metadataFeature.extent).toBe(4096);
      expect(metadataFeature.id).toBeUndefined();
      expect(metadataFeature.properties['hits.total.relation']).toBe('eq');
      expect(metadataFeature.properties['hits.total.value']).toBe(2);
      expect(metadataFeature.properties.timed_out).toBe(false);
      expect(metadataFeature.loadGeometry()).toStrictEqual([
        [
          { x: 44, y: 2382 },
          { x: 44, y: 1913 },
          { x: 550, y: 1913 },
          { x: 550, y: 2382 },
          { x: 44, y: 2382 },
        ],
      ]);
    }
  );

  apiTest(
    'should return ES vector tile containing label features when hasLabels is true',
    async ({ apiClient }) => {
      const tileUrlParams = getTileUrlParams({ ...defaultParams, hasLabels: true });
      const response = await apiClient.get(`internal/maps/mvt/getTile/2/1/1.pbf?${tileUrlParams}`, {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'buffer',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.headers['content-disposition']).toBe('inline');
      expect(response.headers['content-type']).toBe('application/x-protobuf');
      expect(response.headers['cache-control']).toBe('public, max-age=3600');

      const jsonTile = new VectorTile(new Protobuf(response.body));
      const layer = jsonTile.layers.hits;
      expect(layer).toHaveLength(4);

      const feature = findFeature(layer, (feat: any) => {
        return (
          feat.properties._id === 'AU_x3_BsGFA8no6Qjjug' &&
          feat.properties._mvt_label_position === true
        );
      });
      expect(feature).toBeDefined();
      expect(feature.type).toBe(1);
      expect(feature.extent).toBe(4096);
      expect(feature.id).toBeUndefined();
      expect(feature.properties).toStrictEqual({
        '@timestamp': '1442709961071',
        _id: 'AU_x3_BsGFA8no6Qjjug',
        _index: 'logstash-2015.09.20',
        bytes: 9252,
        'machine.os.raw': 'ios',
        _mvt_label_position: true,
      });
      expect(feature.loadGeometry()).toStrictEqual([[{ x: 44, y: 2382 }]]);
    }
  );

  apiTest('should return error when index does not exist', async ({ apiClient }) => {
    const tileUrlParams = getTileUrlParams({ ...defaultParams, index: 'notRealIndex' });
    const response = await apiClient.get(`internal/maps/mvt/getTile/2/1/1.pbf?${tileUrlParams}`, {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      responseType: 'buffer',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should return elasticsearch error', async ({ apiClient }) => {
    const tileUrlParams = getTileUrlParams({
      ...defaultParams,
      requestBody: {
        ...defaultParams.requestBody,
        query: {
          error_query: {
            indices: [
              {
                error_type: 'exception',
                message: 'local shard failure message 123',
                name: 'logstash-*',
              },
            ],
          },
        },
      },
    });
    const response = await apiClient.get(`internal/maps/mvt/getTile/2/1/1.pbf?${tileUrlParams}`, {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.error.reason).toBe('all shards failed');
  });
});
