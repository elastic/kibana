/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFileUri } from './parse_file_uri';

describe('parseFileUri', () => {
  it('returns undefined when the URI is empty or has an unrecognized scheme', () => {
    expect(parseFileUri('')).toBeUndefined();
    expect(parseFileUri('   ')).toBeUndefined();
    expect(parseFileUri('acme-logs/vpcflow')).toBeUndefined();
    expect(parseFileUri('ftp://acme-logs/vpcflow')).toBeUndefined();
  });

  it('parses an s3 URI with a glob', () => {
    expect(parseFileUri('s3://acme-logs/vpcflow/**/*.parquet')).toEqual({
      type: 's3',
      bucket: 'acme-logs',
      prefix: 'vpcflow/',
      formatHint: 'parquet',
    });
  });

  it('supports the s3a and s3n schemes', () => {
    expect(parseFileUri('s3a://acme-logs/vpcflow/*.csv')?.type).toBe('s3');
    expect(parseFileUri('s3n://acme-logs/vpcflow/*.csv')?.type).toBe('s3');
  });

  it('parses a gcs URI', () => {
    expect(parseFileUri('gs://acme-logs/vpcflow/2024/*.ndjson')).toEqual({
      type: 'gcs',
      bucket: 'acme-logs',
      prefix: 'vpcflow/2024/',
      formatHint: 'ndjson',
    });
  });

  it('treats the azure container as the bucket', () => {
    expect(parseFileUri('https://acct.blob.core.windows.net/logs/vpcflow/*.parquet')).toEqual({
      type: 'azure',
      bucket: 'logs',
      prefix: 'vpcflow/',
      formatHint: 'parquet',
    });
  });

  it('drops a trailing file name from the prefix', () => {
    expect(parseFileUri('s3://acme-logs/vpcflow/2024/data.csv')).toEqual({
      type: 's3',
      bucket: 'acme-logs',
      prefix: 'vpcflow/2024/',
      formatHint: 'csv',
    });
  });

  it('returns an empty prefix and format hint when they cannot be parsed', () => {
    expect(parseFileUri('s3://acme-logs')).toEqual({
      type: 's3',
      bucket: 'acme-logs',
      prefix: '',
      formatHint: '',
    });
    expect(parseFileUri('s3://acme-logs/**')).toEqual({
      type: 's3',
      bucket: 'acme-logs',
      prefix: '',
      formatHint: '',
    });
  });

  it('ignores query and hash fragments', () => {
    expect(parseFileUri('s3://acme-logs/vpcflow/**/*.parquet?region=us-east-1')).toEqual({
      type: 's3',
      bucket: 'acme-logs',
      prefix: 'vpcflow/',
      formatHint: 'parquet',
    });
  });
});
