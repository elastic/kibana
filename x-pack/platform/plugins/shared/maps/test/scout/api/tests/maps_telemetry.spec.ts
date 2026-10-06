/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - maps telemetry', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver, kbnClient }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    // telemtry takes inventory of saved objects
    // make sure there are no unexpected saved objects before running test
    await kbnClient.savedObjects.clean({ types: ['dashboard', 'index-pattern', 'map'] });
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logstashFunctional);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.mapsData);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.maps);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.maps);
  });

  apiTest(
    'should return the correct telemetry values for map saved objects',
    async ({ apiClient }) => {
      const response = await apiClient.post('internal/telemetry/clusters/_stats', {
        headers: { ...testData.INTERNAL_HEADERS_V2, ...cookieHeader },
        body: {
          unencrypted: true,
          refreshCache: true,
        },
      });

      expect(response).toHaveStatusCode(200);

      const apiResponse = response.body[0].stats;

      const geoPointFieldStats = apiResponse.cluster_stats.indices.mappings.field_types.find(
        (fieldStat: { name: string }) => fieldStat.name === 'geo_point'
      );
      expect(geoPointFieldStats.count).toBeGreaterThanOrEqual(71);

      const geoShapeFieldStats = apiResponse.cluster_stats.indices.mappings.field_types.find(
        (fieldStat: { name: string }) => fieldStat.name === 'geo_shape'
      );
      expect(geoShapeFieldStats.count).toBeGreaterThanOrEqual(3);

      const mapUsage = apiResponse.stack_stats.kibana.plugins.maps;
      delete mapUsage.timeCaptured;

      expect(mapUsage).toStrictEqual({
        mapsTotalCount: 27,
        basemaps: {},
        joins: { term: { min: 1, max: 1, total: 4, avg: 0.14814814814814814 } },
        layerTypes: {
          es_docs: { min: 1, max: 3, total: 19, avg: 0.7037037037037037 },
          es_agg_grids: { min: 1, max: 1, total: 6, avg: 0.2222222222222222 },
          es_point_to_point: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          es_top_hits: { min: 1, max: 1, total: 2, avg: 0.07407407407407407 },
          es_agg_heatmap: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          esql: { min: 1, max: 1, total: 2, avg: 0.07407407407407407 },
          kbn_tms_raster: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          ems_basemap: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          ems_region: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
        },
        resolutions: {
          coarse: { min: 1, max: 1, total: 4, avg: 0.14814814814814814 },
          super_fine: { min: 1, max: 1, total: 3, avg: 0.1111111111111111 },
        },
        scalingOptions: {
          limit: { min: 1, max: 3, total: 14, avg: 0.5185185185185185 },
          clusters: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          mvt: { min: 1, max: 1, total: 4, avg: 0.14814814814814814 },
        },
        attributesPerMap: {
          customIconsCount: { avg: 0, max: 0, min: 0 },
          dataSourcesCount: { avg: 1.2222222222222223, max: 7, min: 1 },
          emsVectorLayersCount: {
            idThatDoesNotExitForEMSFileSource: {
              avg: 0.037037037037037035,
              max: 1,
              min: 1,
            },
          },
          layerTypesCount: {
            BLENDED_VECTOR: { avg: 0.037037037037037035, max: 1, min: 1 },
            EMS_VECTOR_TILE: { avg: 0.037037037037037035, max: 1, min: 1 },
            GEOJSON_VECTOR: { avg: 0.8518518518518519, max: 6, min: 1 },
            HEATMAP: { avg: 0.037037037037037035, max: 1, min: 1 },
            MVT_VECTOR: { avg: 0.25925925925925924, max: 1, min: 1 },
            RASTER_TILE: { avg: 0.037037037037037035, max: 1, min: 1 },
          },
          layersCount: { avg: 1.2592592592592593, max: 8, min: 1 },
        },
      });
    }
  );
});
