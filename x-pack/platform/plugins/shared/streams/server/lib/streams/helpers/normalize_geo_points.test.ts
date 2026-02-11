/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  normalizeGeoPointsInObject,
  buildGeoPointExistsQuery,
  detectGeoPointPatternsFromDocuments,
  rebuildGeoPointsFromFlattened,
  collectFieldsWithGeoPoints,
} from './normalize_geo_points';

describe('normalize_geo_points', () => {
  describe('normalizeGeoPointsInObject', () => {
    it('should regroup flattened .lat/.lon into { lat, lon } when parent is geo_point', () => {
      const obj = {
        'source.geo.location.lat': 40.7128,
        'source.geo.location.lon': -74.006,
        message: 'test',
      };
      const geoPointFields = new Set(['source.geo.location']);

      const result = normalizeGeoPointsInObject(obj, geoPointFields);

      expect(result).toEqual({
        'source.geo.location': { lat: 40.7128, lon: -74.006 },
        message: 'test',
      });
    });

    it('should NOT regroup .lat/.lon if parent is not a geo_point', () => {
      const obj = {
        'source.geo.location.lat': 40.7128,
        'source.geo.location.lon': -74.006,
        message: 'test',
      };
      const geoPointFields = new Set<string>();

      const result = normalizeGeoPointsInObject(obj, geoPointFields);

      expect(result).toEqual({
        'source.geo.location.lat': 40.7128,
        'source.geo.location.lon': -74.006,
        message: 'test',
      });
    });

    it('should keep WKT strings as-is for geo_point fields', () => {
      const obj = { location: 'POINT (-74.006 40.7128)', message: 'test' };
      const geoPointFields = new Set(['location']);

      const result = normalizeGeoPointsInObject(obj, geoPointFields);

      expect(result).toEqual({
        location: 'POINT (-74.006 40.7128)',
        message: 'test',
      });
    });
  });

  describe('buildGeoPointExistsQuery', () => {
    it('should build query that matches field or flattened lat/lon', () => {
      const result = buildGeoPointExistsQuery('location');

      expect(result).toEqual({
        bool: {
          should: [
            { exists: { field: 'location' } },
            {
              bool: {
                filter: [
                  { exists: { field: 'location.lat' } },
                  { exists: { field: 'location.lon' } },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('detectGeoPointPatternsFromDocuments', () => {
    it('should detect { lat, lon } object patterns', () => {
      const documents = [{ location: { lat: 40.7128, lon: -74.006 }, message: 'test' }];

      const result = detectGeoPointPatternsFromDocuments(documents);

      expect(result).toEqual(new Set(['location']));
    });

    it('should detect flattened .lat/.lon patterns', () => {
      const documents = [
        {
          'source.geo.location.lat': 40.7128,
          'source.geo.location.lon': -74.006,
          message: 'test',
        },
      ];

      const result = detectGeoPointPatternsFromDocuments(documents);

      expect(result).toEqual(new Set(['source.geo.location']));
    });

    it('should not detect incomplete lat/lon pairs', () => {
      const documents = [{ 'location.lat': 40.7128, message: 'test' }];

      const result = detectGeoPointPatternsFromDocuments(documents);

      expect(result).toEqual(new Set());
    });
  });

  describe('rebuildGeoPointsFromFlattened', () => {
    it('should rebuild geo_point from flattened lat/lon fields', () => {
      const flattenedSource = {
        'location.lat': 40.7128,
        'location.lon': -74.006,
        '@timestamp': '2024-01-01T00:00:00Z',
      };
      const fieldDefinitionKeys = ['location'];
      const geoPointFields = new Set(['location']);

      const result = rebuildGeoPointsFromFlattened(
        flattenedSource,
        fieldDefinitionKeys,
        geoPointFields
      );

      expect(result).toEqual({
        location: { lat: 40.7128, lon: -74.006 },
        '@timestamp': '2024-01-01T00:00:00Z',
      });
    });

    it('should keep @timestamp field', () => {
      const flattenedSource = {
        '@timestamp': '2024-01-01T00:00:00Z',
        'other.field': 'value',
      };
      const fieldDefinitionKeys: string[] = [];
      const geoPointFields = new Set<string>();

      const result = rebuildGeoPointsFromFlattened(
        flattenedSource,
        fieldDefinitionKeys,
        geoPointFields
      );

      expect(result).toEqual({
        '@timestamp': '2024-01-01T00:00:00Z',
      });
    });
  });

  describe('collectFieldsWithGeoPoints', () => {
    it('should identify geo_point fields and add all to mappedFields', () => {
      const mappedFields = new Set<string>();
      const geoPointFields = new Set<string>();
      const fields = {
        location: { type: 'geo_point' },
        message: { type: 'keyword' },
        destination: { type: 'geo_point' },
      };

      collectFieldsWithGeoPoints(fields, mappedFields, geoPointFields);

      expect(mappedFields).toEqual(new Set(['location', 'message', 'destination']));
      expect(geoPointFields).toEqual(new Set(['location', 'destination']));
    });

    it('should accumulate fields from multiple calls', () => {
      const mappedFields = new Set<string>();
      const geoPointFields = new Set<string>();

      collectFieldsWithGeoPoints({ field1: { type: 'keyword' } }, mappedFields, geoPointFields);
      collectFieldsWithGeoPoints({ field2: { type: 'geo_point' } }, mappedFields, geoPointFields);

      expect(mappedFields).toEqual(new Set(['field1', 'field2']));
      expect(geoPointFields).toEqual(new Set(['field2']));
    });
  });
});
