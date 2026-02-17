/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldTypeOptions } from './field_form_type';
import { FIELD_TYPE_MAP } from '../constants';

describe('getFieldTypeOptions', () => {
  describe('alphabetical sorting', () => {
    it('returns options sorted alphabetically by display label', () => {
      const options = getFieldTypeOptions({
        streamType: 'classic',
        enableGeoPointSuggestions: true,
      });
      const labels = options.map((key) => FIELD_TYPE_MAP[key].label);

      // Verify the labels are in sorted order
      const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b));
      expect(labels).toEqual(sortedLabels);
    });

    it('maintains alphabetical sorting when geo_point is excluded', () => {
      const options = getFieldTypeOptions({ streamType: 'wired' });
      const labels = options.map((key) => FIELD_TYPE_MAP[key].label);

      const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b));
      expect(labels).toEqual(sortedLabels);
    });
  });

  describe('filtering behavior', () => {
    it('excludes readonly types', () => {
      const options = getFieldTypeOptions({
        streamType: 'classic',
        enableGeoPointSuggestions: true,
      });

      // system is the only readonly type
      expect(options).not.toContain('system');

      // Verify all returned options have readonly: false
      options.forEach((option) => {
        expect(FIELD_TYPE_MAP[option].readonly).toBe(false);
      });
    });

    it('includes geo_point for classic streams with feature enabled', () => {
      const options = getFieldTypeOptions({
        streamType: 'classic',
        enableGeoPointSuggestions: true,
      });
      expect(options).toContain('geo_point');
    });

    it('includes geo_point for classic streams when feature flag is undefined', () => {
      const options = getFieldTypeOptions({ streamType: 'classic' });
      expect(options).toContain('geo_point');
    });

    it('excludes geo_point for classic streams with feature disabled', () => {
      const options = getFieldTypeOptions({
        streamType: 'classic',
        enableGeoPointSuggestions: false,
      });
      expect(options).not.toContain('geo_point');
    });

    it('excludes geo_point for wired streams regardless of feature flag', () => {
      const optionsWithFlagTrue = getFieldTypeOptions({
        streamType: 'wired',
        enableGeoPointSuggestions: true,
      });
      const optionsWithFlagFalse = getFieldTypeOptions({
        streamType: 'wired',
        enableGeoPointSuggestions: false,
      });
      const optionsWithFlagUndefined = getFieldTypeOptions({ streamType: 'wired' });

      expect(optionsWithFlagTrue).not.toContain('geo_point');
      expect(optionsWithFlagFalse).not.toContain('geo_point');
      expect(optionsWithFlagUndefined).not.toContain('geo_point');
    });
  });

  describe('option completeness', () => {
    it('includes all non-readonly types for classic streams with geo_point enabled', () => {
      const options = getFieldTypeOptions({
        streamType: 'classic',
        enableGeoPointSuggestions: true,
      });

      const expectedTypes = Object.keys(FIELD_TYPE_MAP).filter(
        (key) => !FIELD_TYPE_MAP[key as keyof typeof FIELD_TYPE_MAP].readonly
      );

      expect(options.length).toBe(expectedTypes.length);
      expectedTypes.forEach((type) => {
        expect(options).toContain(type);
      });
    });

    it('includes all non-readonly types except geo_point for wired streams', () => {
      const options = getFieldTypeOptions({ streamType: 'wired' });

      const expectedTypes = Object.keys(FIELD_TYPE_MAP).filter(
        (key) => !FIELD_TYPE_MAP[key as keyof typeof FIELD_TYPE_MAP].readonly && key !== 'geo_point'
      );

      expect(options.length).toBe(expectedTypes.length);
      expectedTypes.forEach((type) => {
        expect(options).toContain(type);
      });
    });
  });
});
