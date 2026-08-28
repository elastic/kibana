/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '../../common';
import { findMatchingDataSource } from './find_matching_data_source';

const s3 = (name: string, region?: string): DataSource => ({
  name,
  description: '',
  type: 's3',
  settings: region ? { region } : {},
});

const gcs = (name: string): DataSource => ({
  name,
  description: '',
  type: 'gcs',
  settings: {},
});

describe('findMatchingDataSource', () => {
  it('matches a single source of the same type', () => {
    expect(findMatchingDataSource([s3('logs'), gcs('gcs-logs')], 's3', '')?.name).toBe('logs');
  });

  it('returns undefined when more than one source could match', () => {
    expect(findMatchingDataSource([s3('logs'), s3('audit')], 's3', '')).toBeUndefined();
  });

  it('returns undefined when no source has the right type', () => {
    expect(findMatchingDataSource([gcs('gcs-logs')], 's3', '')).toBeUndefined();
  });

  it('excludes sources pinned to a different region', () => {
    const dataSources = [s3('east', 'us-east-1'), s3('west', 'us-west-2')];

    expect(findMatchingDataSource(dataSources, 's3', 'us-west-2')?.name).toBe('west');
  });

  it('treats a source without a region as a candidate for any region', () => {
    expect(findMatchingDataSource([s3('any')], 's3', 'us-west-2')?.name).toBe('any');
  });

  it('returns undefined when the only type match is pinned elsewhere', () => {
    expect(findMatchingDataSource([s3('east', 'us-east-1')], 's3', 'us-west-2')).toBeUndefined();
  });

  it('ignores sources of other types when counting candidates', () => {
    const dataSources = [s3('east', 'us-east-1'), s3('west', 'us-west-2'), gcs('gcs-logs')];

    expect(findMatchingDataSource(dataSources, 's3', 'us-east-1')?.name).toBe('east');
  });
});
