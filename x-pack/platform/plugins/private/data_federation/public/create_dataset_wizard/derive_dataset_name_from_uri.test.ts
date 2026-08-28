/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveDatasetNameFromUri } from './derive_dataset_name_from_uri';

describe('deriveDatasetNameFromUri', () => {
  it('joins the first bucket token with the first prefix segment', () => {
    expect(deriveDatasetNameFromUri('s3://acme-logs/vpcflow/**/*.parquet')).toBe('acme_vpcflow');
  });

  it('lowercases and replaces non-alphanumeric characters', () => {
    expect(deriveDatasetNameFromUri('s3://ACME-logs/VPCFlow/**/*.parquet')).toBe('acme_vpcflow');
    expect(deriveDatasetNameFromUri('s3://acme-logs/vpc-flow/**/*.parquet')).toBe('acme_vpc_flow');
  });

  it('falls back to the bucket token when there is no prefix', () => {
    expect(deriveDatasetNameFromUri('s3://acme-logs/**/*.parquet')).toBe('acme');
    expect(deriveDatasetNameFromUri('s3://acme-logs')).toBe('acme');
  });

  it('returns an empty string when the URI cannot be parsed', () => {
    expect(deriveDatasetNameFromUri('')).toBe('');
    expect(deriveDatasetNameFromUri('acme-logs/vpcflow')).toBe('');
  });

  it('uses the container for azure URIs', () => {
    expect(
      deriveDatasetNameFromUri('https://acct.blob.core.windows.net/logs/vpcflow/*.parquet')
    ).toBe('logs_vpcflow');
  });
});
