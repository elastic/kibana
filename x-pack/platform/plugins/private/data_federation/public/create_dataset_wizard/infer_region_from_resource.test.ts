/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inferRegionFromResource } from './infer_region_from_resource';

describe('inferRegionFromResource', () => {
  it('returns the first exact path-segment match', () => {
    expect(inferRegionFromResource('s3://logs/us-east-1/**/*.parquet')).toBe('us-east-1');
    expect(inferRegionFromResource('s3://src/us-east-1/dest/eu-west-1/data.csv')).toBe('us-east-1');
  });

  it('prefers a valid region query parameter over a path segment', () => {
    expect(inferRegionFromResource('s3://logs/us-east-1/data.csv?region=eu-west-1')).toBe(
      'eu-west-1'
    );
  });

  it('falls through to the path when the query region is not an AWS region id', () => {
    expect(inferRegionFromResource('s3://logs/us-west-2/data.csv?region=not-a-region')).toBe(
      'us-west-2'
    );
  });

  it('matches region ids case-insensitively and returns the canonical id', () => {
    expect(inferRegionFromResource('s3://logs/US-EAST-1/data.csv')).toBe('us-east-1');
    expect(inferRegionFromResource('s3://logs/access?region=Eu-West-1')).toBe('eu-west-1');
  });

  it('supports s3a and s3n schemes', () => {
    expect(inferRegionFromResource('s3a://logs/ap-southeast-1/data.csv')).toBe('ap-southeast-1');
    expect(inferRegionFromResource('s3n://logs/eu-central-1/data.csv')).toBe('eu-central-1');
  });

  it('does not match a region id embedded in a longer segment', () => {
    expect(inferRegionFromResource('s3://my-us-east-1-logs/data.csv')).toBe('');
    expect(inferRegionFromResource('s3://logs/us-east-1-backup/data.csv')).toBe('');
  });

  it('returns empty for non-S3 URIs or when no region is present', () => {
    expect(inferRegionFromResource('')).toBe('');
    expect(inferRegionFromResource('s3://logs/access/**/*.parquet')).toBe('');
    expect(inferRegionFromResource('gs://logs/us-east-1/data.csv')).toBe('');
    expect(inferRegionFromResource('https://account.blob.core.windows.net/us-east-1/data.csv')).toBe(
      ''
    );
  });
});
