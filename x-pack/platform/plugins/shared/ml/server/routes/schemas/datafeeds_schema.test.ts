/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { datafeedConfigSchema } from './datafeeds_schema';

describe('datafeedConfigSchema', () => {
  it('accepts ES|QL datafeed fields', () => {
    expect(
      datafeedConfigSchema.validate({
        job_id: 'job-1',
        esql_query: 'FROM logs-* | KEEP @timestamp, value',
        source_time_field: '@timestamp',
        grouping_interval: '1h',
      })
    ).toStrictEqual({
      job_id: 'job-1',
      esql_query: 'FROM logs-* | KEEP @timestamp, value',
      source_time_field: '@timestamp',
      grouping_interval: '1h',
    });
  });

  it('rejects unknown fields', () => {
    expect(() => datafeedConfigSchema.validate({ unexpected: 'field' })).toThrow();
  });
});
