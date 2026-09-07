/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseExperimentalConfigValue,
  getExperimentalAllowedValues,
  allowedExperimentalValues,
} from './experimental_features';

describe('parseExperimentalConfigValue', () => {
  it('should return all default values when config is empty', () => {
    const { features, invalid } = parseExperimentalConfigValue([]);

    expect(features).toEqual(allowedExperimentalValues);
    expect(invalid).toEqual([]);
  });

  it('should enable a valid feature flag', () => {
    // Precondition: if the default flips to true, fail here instead of passing vacuously below.
    expect(allowedExperimentalValues.crossProjectSearch).toBe(false);

    const { features, invalid } = parseExperimentalConfigValue(['crossProjectSearch']);

    expect(features.crossProjectSearch).toBe(true);
    expect(invalid).toEqual([]);
  });

  it('should report a graduated feature flag as invalid', () => {
    expect(parseExperimentalConfigValue(['queryHistoryRework']).invalid).toEqual([
      'queryHistoryRework',
    ]);
    expect(parseExperimentalConfigValue(['unifiedDataTable']).invalid).toEqual([
      'unifiedDataTable',
    ]);
  });

  it('should track invalid feature flags', () => {
    const { features, invalid } = parseExperimentalConfigValue(['invalidFeature']);

    expect(features).toEqual(allowedExperimentalValues);
    expect(invalid).toEqual(['invalidFeature']);
  });

  it('should handle mix of valid and invalid feature flags', () => {
    const { features, invalid } = parseExperimentalConfigValue([
      'crossProjectSearch',
      'invalidFeature1',
      'invalidFeature2',
    ]);

    expect(features.crossProjectSearch).toBe(true);
    expect(invalid).toEqual(['invalidFeature1', 'invalidFeature2']);
  });

  it('should handle disable: prefix to turn off features', () => {
    const { features, invalid } = parseExperimentalConfigValue([
      'exportResults',
      'disable:exportResults',
    ]);

    expect(features.exportResults).toBe(false);
    expect(invalid).toEqual([]);
  });

  it('should track invalid features even with disable: prefix', () => {
    const { features, invalid } = parseExperimentalConfigValue(['disable:invalidFeature']);

    expect(features).toEqual(allowedExperimentalValues);
    expect(invalid).toEqual(['invalidFeature']);
  });
});

describe('getExperimentalAllowedValues', () => {
  it('should return array of allowed feature flag keys', () => {
    const allowedValues = getExperimentalAllowedValues();

    expect(allowedValues).toEqual(Object.keys(allowedExperimentalValues));
    expect(allowedValues).toContain('exportResults');
  });

  it('should return exactly the currently supported flags', () => {
    // Pinned literally: adding or graduating a flag must be an explicit change here.
    expect(getExperimentalAllowedValues()).toEqual([
      'exportResults',
      'rruleScheduling',
      'crossProjectSearch',
    ]);
  });
});

describe('allowedExperimentalValues', () => {
  it('should pin the default state of every flag', () => {
    expect(allowedExperimentalValues).toEqual({
      exportResults: true,
      rruleScheduling: true,
      crossProjectSearch: false,
    });
  });
});
