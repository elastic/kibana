/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mapSavedObjects from './test_resources/sample_map_saved_objects.json';
import indexPatternSavedObjects from './test_resources/sample_index_pattern_saved_objects';
import { buildMapsTelemetry } from './maps_telemetry';

describe('buildMapsTelemetry', () => {

  const settings = { showMapVisualizationTypes: false };

  test('returns zeroed telemetry data when there are no saved objects',
    async () => {

      const result = buildMapsTelemetry({ mapSavedObjects: [], indexPatternSavedObjects: [], settings });

      expect(result).toMatchObject({
        indexPatternsWithGeoFieldCount: 0,
        attributesPerMap: {
          dataSourcesCount: {
            avg: 0,
            max: 0,
            min: 0
          },
          emsVectorLayersCount: {},
          layerTypesCount: {},
          layersCount: {
            avg: 0,
            max: 0,
            min: 0
          }
        },
        mapsTotalCount: 0,
        settings: {
          showMapVisualizationTypes: false
        }
      });
    });

  test('returns expected telemetry data from saved objects', async () => {

    const result = buildMapsTelemetry({ mapSavedObjects, indexPatternSavedObjects, settings });

    expect(result).toMatchObject({
      indexPatternsWithGeoFieldCount: 2,
      attributesPerMap: {
        dataSourcesCount: {
          avg: 2.6666666666666665,
          max: 3,
          min: 2
        },
        emsVectorLayersCount: {
          canada_provinces: {
            avg: 0.3333333333333333,
            max: 1,
            min: 1
          },
          france_departments: {
            avg: 0.3333333333333333,
            max: 1,
            min: 1
          },
          italy_provinces: {
            avg: 0.3333333333333333,
            max: 1,
            min: 1
          }
        },
        layerTypesCount: {
          TILE: {
            avg: 1,
            max: 1,
            min: 1
          },
          VECTOR: {
            avg: 1.6666666666666667,
            max: 2,
            min: 1
          }
        },
        layersCount: {
          avg: 2.6666666666666665,
          max: 3,
          min: 2
        }
      },
      mapsTotalCount: 3,
      settings: {
        showMapVisualizationTypes: false
      }
    });
  });
});
