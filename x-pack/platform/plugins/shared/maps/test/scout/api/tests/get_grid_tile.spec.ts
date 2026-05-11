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

apiTest.describe('Maps - getGridTile', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  const defaultParams = {
    geometryFieldName: 'geo.coordinates',
    hasLabels: false,
    index: 'logstash-*',
    gridPrecision: 8,
    requestBody: {
      aggs: {
        avg_of_bytes: {
          avg: { field: 'bytes' },
        },
      },
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
    },
    renderAs: 'point',
  };

  apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logstashFunctional);
  });

  apiTest('should return vector tile with expected headers', async ({ apiClient }) => {
    const response = await apiClient.get(
      `internal/maps/mvt/getGridTile/3/2/3.pbf?${getTileUrlParams(defaultParams)}`,
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
  });

  apiTest(
    'should return vector tile containing clusters when renderAs is "point"',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        `internal/maps/mvt/getGridTile/3/2/3.pbf?${getTileUrlParams(defaultParams)}`,
        {
          headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'buffer',
        }
      );

      expect(response).toHaveStatusCode(200);
      const jsonTile = new VectorTile(new Protobuf(response.body));
      const layer = jsonTile.layers.aggs;
      expect(layer).toHaveLength(1);

      const clusterFeature = layer.feature(0);
      expect(clusterFeature.type).toBe(1);
      expect(clusterFeature.extent).toBe(4096);
      expect(clusterFeature.id).toBeUndefined();
      expect(clusterFeature.properties).toStrictEqual({
        _count: 1,
        _key: '11/517/809',
        'avg_of_bytes.value': 9252,
      });
      expect(clusterFeature.loadGeometry()).toStrictEqual([[{ x: 87, y: 667 }]]);
    }
  );

  apiTest(
    'should return vector tile containing clusters with renderAs is "heatmap"',
    async ({ apiClient }) => {
      const tileUrlParams = getTileUrlParams({ ...defaultParams, renderAs: 'heatmap' });
      const response = await apiClient.get(
        `internal/maps/mvt/getGridTile/3/2/3.pbf?${tileUrlParams}`,
        {
          headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'buffer',
        }
      );

      expect(response).toHaveStatusCode(200);
      const jsonTile = new VectorTile(new Protobuf(response.body));
      const layer = jsonTile.layers.aggs;
      expect(layer).toHaveLength(1);

      const clusterFeature = layer.feature(0);
      expect(clusterFeature.type).toBe(1);
      expect(clusterFeature.extent).toBe(4096);
      expect(clusterFeature.id).toBeUndefined();
      expect(clusterFeature.properties).toStrictEqual({
        _count: 1,
        _key: '11/517/809',
        'avg_of_bytes.value': 9252,
      });
      expect(clusterFeature.loadGeometry()).toStrictEqual([[{ x: 87, y: 667 }]]);
    }
  );

  apiTest(
    'should return vector tile containing grid features when renderAs is "grid"',
    async ({ apiClient }) => {
      const tileUrlParams = getTileUrlParams({ ...defaultParams, renderAs: 'grid' });
      const response = await apiClient.get(
        `internal/maps/mvt/getGridTile/3/2/3.pbf?${tileUrlParams}`,
        {
          headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'buffer',
        }
      );

      expect(response).toHaveStatusCode(200);
      const jsonTile = new VectorTile(new Protobuf(response.body));
      const layer = jsonTile.layers.aggs;
      expect(layer).toHaveLength(1);

      const gridFeature = layer.feature(0);
      expect(gridFeature.type).toBe(3);
      expect(gridFeature.extent).toBe(4096);
      expect(gridFeature.id).toBeUndefined();
      expect(gridFeature.properties).toStrictEqual({
        _count: 1,
        _key: '11/517/809',
        'avg_of_bytes.value': 9252,
      });
      expect(gridFeature.loadGeometry()).toStrictEqual([
        [
          { x: 80, y: 672 },
          { x: 80, y: 656 },
          { x: 96, y: 656 },
          { x: 96, y: 672 },
          { x: 80, y: 672 },
        ],
      ]);
    }
  );

  apiTest(
    'should return vector tile containing hexagon features when renderAs is "hex"',
    async ({ apiClient }) => {
      const tileUrlParams = getTileUrlParams({ ...defaultParams, renderAs: 'hex' });
      const response = await apiClient.get(
        `internal/maps/mvt/getGridTile/3/2/3.pbf?${tileUrlParams}`,
        {
          headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'buffer',
        }
      );

      expect(response).toHaveStatusCode(200);
      const jsonTile = new VectorTile(new Protobuf(response.body));
      const layer = jsonTile.layers.aggs;
      expect(layer).toHaveLength(1);

      const gridFeature = layer.feature(0);
      expect(gridFeature.type).toBe(3);
      expect(gridFeature.extent).toBe(4096);
      expect(gridFeature.id).toBeUndefined();
      expect(gridFeature.properties).toStrictEqual({
        _count: 1,
        _key: '84264a3ffffffff',
        'avg_of_bytes.value': 9252,
      });
      expect(gridFeature.loadGeometry()).toStrictEqual([
        [
          { x: 89, y: 710 },
          { x: 67, y: 696 },
          { x: 67, y: 669 },
          { x: 89, y: 657 },
          { x: 112, y: 672 },
          { x: 111, y: 698 },
          { x: 89, y: 710 },
        ],
      ]);
    }
  );

  apiTest(
    'should return vector tile containing label features when hasLabels is true',
    async ({ apiClient }) => {
      const tileUrlParams = getTileUrlParams({
        ...defaultParams,
        hasLabels: 'true',
        renderAs: 'hex',
      });
      const response = await apiClient.get(
        `internal/maps/mvt/getGridTile/3/2/3.pbf?${tileUrlParams}`,
        {
          headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'buffer',
        }
      );

      expect(response).toHaveStatusCode(200);
      const jsonTile = new VectorTile(new Protobuf(response.body));
      const layer = jsonTile.layers.aggs;
      expect(layer).toHaveLength(2);

      const labelFeature = findFeature(layer, (feature) => {
        return feature.properties._mvt_label_position === true;
      });
      expect(labelFeature).toBeDefined();
      expect(labelFeature.type).toBe(1);
      expect(labelFeature.extent).toBe(4096);
      expect(labelFeature.id).toBeUndefined();
      expect(labelFeature.properties).toStrictEqual({
        _count: 1,
        _key: '84264a3ffffffff',
        'avg_of_bytes.value': 9252,
        _mvt_label_position: true,
      });
      expect(labelFeature.loadGeometry()).toStrictEqual([[{ x: 89, y: 684 }]]);
    }
  );

  apiTest('should return vector tile with meta layer', async ({ apiClient }) => {
    const response = await apiClient.get(
      `internal/maps/mvt/getGridTile/3/2/3.pbf?${getTileUrlParams(defaultParams)}`,
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'buffer',
      }
    );

    expect(response).toHaveStatusCode(200);
    const jsonTile = new VectorTile(new Protobuf(response.body));
    const metaDataLayer = jsonTile.layers.meta;
    expect(metaDataLayer).toHaveLength(1);

    const metadataFeature = metaDataLayer.feature(0);
    expect(metadataFeature.type).toBe(3);
    expect(metadataFeature.extent).toBe(4096);

    expect(metadataFeature.properties['aggregations._count.avg']).toBe(1);
    expect(metadataFeature.properties['aggregations._count.count']).toBe(1);
    expect(metadataFeature.properties['aggregations._count.min']).toBe(1);
    expect(metadataFeature.properties['aggregations._count.sum']).toBe(1);

    expect(metadataFeature.properties['aggregations.avg_of_bytes.avg']).toBe(9252);
    expect(metadataFeature.properties['aggregations.avg_of_bytes.count']).toBe(1);
    expect(metadataFeature.properties['aggregations.avg_of_bytes.max']).toBe(9252);
    expect(metadataFeature.properties['aggregations.avg_of_bytes.min']).toBe(9252);
    expect(metadataFeature.properties['aggregations.avg_of_bytes.sum']).toBe(9252);

    expect(metadataFeature.properties['hits.total.relation']).toBe('eq');
    expect(metadataFeature.properties['hits.total.value']).toBe(1);

    expect(metadataFeature.loadGeometry()).toStrictEqual([
      [
        { x: 0, y: 4096 },
        { x: 0, y: 0 },
        { x: 4096, y: 0 },
        { x: 4096, y: 4096 },
        { x: 0, y: 4096 },
      ],
    ]);
  });

  apiTest('should return error when index does not exist', async ({ apiClient }) => {
    const tileUrlParams = getTileUrlParams({ ...defaultParams, index: 'notRealIndex' });
    const response = await apiClient.get(
      `internal/maps/mvt/getGridTile/3/2/3.pbf?${tileUrlParams}`,
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'buffer',
      }
    );

    expect(response).toHaveStatusCode(404);
  });
});
