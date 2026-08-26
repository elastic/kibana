/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  normalizeLogLinesForUpload,
  normalizeLogSamplesFromFileContent,
  UPLOAD_SAMPLES_MAX_LINES,
} from './upload_samples_limits';

describe('normalizeLogSamplesFromFileContent', () => {
  it('splits on newlines and drops empty lines', () => {
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent('a\n\n b \nc');
    expect(samples).toEqual(['a', 'b', 'c']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('parses minified JSON array into one sample per element', () => {
    const { samples, linesOmittedOverLimit } =
      normalizeLogSamplesFromFileContent('[{"a":1},{"b":2}]');
    expect(samples).toEqual(['{"a":1}', '{"b":2}']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('parses pretty-printed JSON array into one sample per element', () => {
    const content = `[
  {"a": 1},
  {"b": 2}
]`;
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent(content);
    expect(samples).toEqual(['{"a":1}', '{"b":2}']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('stringifies array of primitives', () => {
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent('["foo","bar"]');
    expect(samples).toEqual(['"foo"', '"bar"']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('handles mixed-type JSON array elements', () => {
    const { samples, linesOmittedOverLimit } =
      normalizeLogSamplesFromFileContent('[{"a":1},"x",42,null]');
    expect(samples).toEqual(['{"a":1}', '"x"', '42', 'null']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('handles nested objects in JSON array', () => {
    const { samples, linesOmittedOverLimit } =
      normalizeLogSamplesFromFileContent('[{"a":{"b":1}}]');
    expect(samples).toEqual(['{"a":{"b":1}}']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('handles single-element JSON array', () => {
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent('[{"a":1}]');
    expect(samples).toEqual(['{"a":1}']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('handles empty JSON array', () => {
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent('[]');
    expect(samples).toEqual([]);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('parses whitespace-padded JSON array', () => {
    const content = '  \n [ {"a":1} ] \n  ';
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent(content);
    expect(samples).toEqual(['{"a":1}']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('falls back to newline split for NDJSON', () => {
    const { samples, linesOmittedOverLimit } =
      normalizeLogSamplesFromFileContent('{"a":1}\n{"b":2}');
    expect(samples).toEqual(['{"a":1}', '{"b":2}']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('falls back to newline split for plain text logs', () => {
    const { samples, linesOmittedOverLimit } =
      normalizeLogSamplesFromFileContent('log line 1\nlog line 2');
    expect(samples).toEqual(['log line 1', 'log line 2']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('falls back to newline split for invalid JSON', () => {
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent('[broken json');
    expect(samples).toEqual(['[broken json']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('falls back to newline split for single JSON object', () => {
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent('{"a":1}');
    expect(samples).toEqual(['{"a":1}']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('falls back to newline split for JSON string value', () => {
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent('"hello"');
    expect(samples).toEqual(['"hello"']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('falls back to newline split for JSON number value', () => {
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent('42');
    expect(samples).toEqual(['42']);
    expect(linesOmittedOverLimit).toBe(0);
  });

  it('caps JSON array elements at UPLOAD_SAMPLES_MAX_LINES', () => {
    const arr = Array.from({ length: UPLOAD_SAMPLES_MAX_LINES + 5 }, (_, i) => i);
    const content = JSON.stringify(arr);
    const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent(content);
    expect(samples).toHaveLength(UPLOAD_SAMPLES_MAX_LINES);
    expect(linesOmittedOverLimit).toBe(5);
  });

  it('caps at UPLOAD_SAMPLES_MAX_LINES non-empty lines', () => {
    const lines = Array.from({ length: UPLOAD_SAMPLES_MAX_LINES + 5 }, (_, i) => `L${i}`);
    const { samples, linesOmittedOverLimit } = normalizeLogLinesForUpload(lines);
    expect(samples).toHaveLength(UPLOAD_SAMPLES_MAX_LINES);
    expect(linesOmittedOverLimit).toBe(5);
  });
});
