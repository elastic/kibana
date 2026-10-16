/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlOutputPreviewQuery } from './esql_output_preview_query';

describe('buildEsqlOutputPreviewQuery', () => {
  it('appends LIMIT 100 as its own command', () => {
    expect(buildEsqlOutputPreviewQuery('FROM logs-* | KEEP host')).toBe(
      'FROM logs-* | KEEP host\n| LIMIT 100'
    );
  });

  it('drops a dangling trailing pipe and surrounding whitespace', () => {
    expect(buildEsqlOutputPreviewQuery('  FROM logs-* |  \n')).toBe('FROM logs-*\n| LIMIT 100');
  });

  it('keeps the appended LIMIT out of a trailing line comment', () => {
    expect(buildEsqlOutputPreviewQuery('FROM logs-* | KEEP host // just hosts')).toBe(
      'FROM logs-* | KEEP host // just hosts\n| LIMIT 100'
    );
  });

  it('honours a custom limit', () => {
    expect(buildEsqlOutputPreviewQuery('FROM a', 5)).toBe('FROM a\n| LIMIT 5');
  });
});
