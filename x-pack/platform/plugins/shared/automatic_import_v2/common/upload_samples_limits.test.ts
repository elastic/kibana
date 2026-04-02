/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeLogSamplesFromFileContent, MAX_LOG_SAMPLES } from './upload_samples_limits';

describe('normalizeLogSamplesFromFileContent', () => {
  it('parses line-based content and drops empty lines', () => {
    const result = normalizeLogSamplesFromFileContent('a\n\n b \nc');
    expect(result.samples).toEqual(['a', 'b', 'c']);
    expect(result.samplesOmittedOverLimit).toBe(0);
    expect(result.detectedFormat).toBe('line_based');
  });

  it('caps at MAX_LOG_SAMPLES', () => {
    const lines = Array.from({ length: MAX_LOG_SAMPLES + 5 }, (_, i) => `L${i}`).join('\n');
    const result = normalizeLogSamplesFromFileContent(lines);
    expect(result.samples).toHaveLength(MAX_LOG_SAMPLES);
    expect(result.samplesOmittedOverLimit).toBe(5);
  });

  it('returns EMPTY error for empty content', () => {
    const result = normalizeLogSamplesFromFileContent('');
    expect(result.samples).toHaveLength(0);
    expect(result.error).toBe('EMPTY');
  });

  it('parses NDJSON format', () => {
    const content = '{"a":1}\n{"b":2}';
    const result = normalizeLogSamplesFromFileContent(content);
    expect(result.detectedFormat).toBe('ndjson');
    expect(result.samples).toHaveLength(2);
  });

  it('parses JSON array format', () => {
    const content = '[{"a":1},{"b":2}]';
    const result = normalizeLogSamplesFromFileContent(content);
    expect(result.detectedFormat).toBe('json_array');
    expect(result.samples).toHaveLength(2);
  });
});
