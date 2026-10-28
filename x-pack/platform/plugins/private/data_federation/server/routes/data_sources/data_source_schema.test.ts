/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { putDataSourceBodySchema } from './data_source_schema';

describe('putDataSourceBodySchema', () => {
  it('accepts S3 region, endpoint, and addressing_style which are unset if missing on update', () => {
    const settings = {
      auth: 'anonymous',
      region: 'eu-central-1',
      endpoint: 'https://s3.example.com',
      addressing_style: 'path',
    };

    expect(putDataSourceBodySchema.validate({ type: 's3', description: '', settings })).toEqual({
      type: 's3',
      description: '',
      settings,
    });
  });
});
