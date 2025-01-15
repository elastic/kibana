/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoJsonFileSource } from './geojson_file_source';
import { BoundsRequestMeta } from '../vector_source';
import { FIELD_ORIGIN } from '../../../../common/constants';

describe('GeoJsonFileSource', () => {
  describe('getName', () => {
    it('should get default display name', async () => {
      const geojsonFileSource = new GeoJsonFileSource({});
      expect(await geojsonFileSource.getDisplayName()).toBe('Features');
    });
  });
  describe('getBounds', () => {
    it('should get null bounds', async () => {
      const geojsonFileSource = new GeoJsonFileSource({});
      expect(
        await geojsonFileSource.getBoundsForFilters({} as unknown as BoundsRequestMeta, () => {})
      ).toEqual(null);
    });

    it('should get bounds from feature collection', async () => {
      const geojsonFileSource = new GeoJsonFileSource({
        __featureCollection: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [0, 1],
              },
              properties: {},
            },
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [2, 3],
              },
              properties: {},
            },
          ],
        },
      });

      expect(geojsonFileSource.isBoundsAware()).toBe(true);
      expect(
        await geojsonFileSource.getBoundsForFilters({} as unknown as BoundsRequestMeta, () => {})
      ).toEqual({
        maxLat: 3,
        maxLon: 2,
        minLat: 1,
        minLon: 0,
      });
    });
  });

  describe('getFields', () => {
    it('should get fields from config', async () => {
      const geojsonFileSource = new GeoJsonFileSource({
        __fields: [
          {
            type: 'string',
            name: 'foo',
          },
          {
            type: 'number',
            name: 'bar',
          },
        ],
      });

      const fields = await geojsonFileSource.getFields();

      const actualFields = fields.map(async (field) => {
        return {
          dataType: await field.getDataType(),
          origin: field.getOrigin(),
          name: field.getName(),
          source: field.getSource(),
        };
      });

      expect(await Promise.all(actualFields)).toEqual([
        {
          dataType: 'string',
          origin: FIELD_ORIGIN.SOURCE,
          source: geojsonFileSource,
          name: 'foo',
        },
        {
          dataType: 'number',
          origin: FIELD_ORIGIN.SOURCE,
          source: geojsonFileSource,
          name: 'bar',
        },
      ]);
    });
  });
});
