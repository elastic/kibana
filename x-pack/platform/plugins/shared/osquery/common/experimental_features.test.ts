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
    const { features, invalid } = parseExperimentalConfigValue(['queryHistoryRework']);

    expect(features.queryHistoryRework).toBe(true);
    expect(invalid).toEqual([]);
  });

  it('should track invalid feature flags', () => {
    const { features, invalid } = parseExperimentalConfigValue(['invalidFeature']);

    expect(features).toEqual(allowedExperimentalValues);
    expect(invalid).toEqual(['invalidFeature']);
  });

  it('should handle mix of valid and invalid feature flags', () => {
    const { features, invalid } = parseExperimentalConfigValue([
      'queryHistoryRework',
      'invalidFeature1',
      'invalidFeature2',
    ]);

    expect(features.queryHistoryRework).toBe(true);
    expect(invalid).toEqual(['invalidFeature1', 'invalidFeature2']);
  });

  it('should handle disable: prefix to turn off features', () => {
    const { features, invalid } = parseExperimentalConfigValue([
      'queryHistoryRework',
      'disable:queryHistoryRework',
    ]);

    expect(features.queryHistoryRework).toBe(false);
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
    expect(allowedValues).toContain('queryHistoryRework');
  });
});
