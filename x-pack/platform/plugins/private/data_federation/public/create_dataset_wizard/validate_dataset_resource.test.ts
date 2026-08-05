/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateResourceForDataSource,
  validateResourceUriForDataSourceType,
} from './validate_dataset_resource';

const s3DataSources = [{ name: 's3-source', type: 's3' as const, description: '', settings: {} }];

describe('validate_dataset_resource', () => {
  it('accepts supported S3 URI schemes', () => {
    expect(validateResourceUriForDataSourceType('s3://bucket/data.csv', 's3')).toBe(true);
    expect(validateResourceUriForDataSourceType('s3a://bucket/data.csv', 's3')).toBe(true);
    expect(validateResourceUriForDataSourceType('s3n://bucket/data.csv', 's3')).toBe(true);
  });

  it('rejects unsupported resource values for S3 data sources', () => {
    expect(validateResourceForDataSource('sfr', 's3-source', s3DataSources)).toMatch(
      /s3:\/\//
    );
  });

  it('validates GCS and Azure schemes', () => {
    expect(validateResourceUriForDataSourceType('gs://bucket/data.parquet', 'gcs')).toBe(true);
    expect(validateResourceUriForDataSourceType(
      'https://account.blob.core.windows.net/logs/data.csv',
      'azure'
    )).toBe(true);
    expect(validateResourceUriForDataSourceType('s3://bucket/data.csv', 'gcs')).not.toBe(true);
  });
});
