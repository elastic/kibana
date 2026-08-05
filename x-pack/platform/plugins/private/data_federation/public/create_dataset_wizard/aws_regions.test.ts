/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_REGIONS, getAwsRegionLabel, getCountryFlagEmoji } from './aws_regions';

describe('aws_regions', () => {
  it('includes all commercial and GovCloud AWS regions', () => {
    expect(AWS_REGIONS.map((region) => region.id)).toEqual(
      expect.arrayContaining([
        'us-east-1',
        'us-west-2',
        'eu-west-1',
        'ap-southeast-1',
        'us-gov-east-1',
        'mx-central-1',
      ])
    );
    expect(AWS_REGIONS.length).toBeGreaterThanOrEqual(36);
  });

  it('returns AWS display labels for known region ids', () => {
    expect(getAwsRegionLabel('eu-west-1')).toBe('Europe (Ireland)');
    expect(getAwsRegionLabel('unknown-region')).toBe('unknown-region');
  });

  it('returns emoji flags for two-letter country codes', () => {
    expect(getCountryFlagEmoji('IE')).toBe('🇮🇪');
    expect(getCountryFlagEmoji('US')).toBe('🇺🇸');
    expect(getCountryFlagEmoji('')).toBeNull();
  });
});
