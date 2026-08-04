/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inferFormatFromResource } from './infer_format_from_resource';

describe('inferFormatFromResource', () => {
  it('maps supported extensions case-insensitively', () => {
    expect(inferFormatFromResource('s3://bucket/data.CSV')).toBe('csv');
    expect(inferFormatFromResource('folder/report.Tsv')).toBe('tsv');
    expect(inferFormatFromResource('logs/events.ndjson')).toBe('ndjson');
    expect(inferFormatFromResource('warehouse/table.parquet')).toBe('parquet');
    expect(inferFormatFromResource('hive/part.orc')).toBe('orc');
  });

  it('returns empty for unknown or missing extensions', () => {
    expect(inferFormatFromResource('')).toBe('');
    expect(inferFormatFromResource('s3://bucket/folder/')).toBe('');
    expect(inferFormatFromResource('data.json')).toBe('');
    expect(inferFormatFromResource('no-extension')).toBe('');
  });
});
