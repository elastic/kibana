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

  it('caps at UPLOAD_SAMPLES_MAX_LINES non-empty lines', () => {
    const lines = Array.from({ length: UPLOAD_SAMPLES_MAX_LINES + 5 }, (_, i) => `L${i}`);
    const { samples, linesOmittedOverLimit } = normalizeLogLinesForUpload(lines);
    expect(samples).toHaveLength(UPLOAD_SAMPLES_MAX_LINES);
    expect(linesOmittedOverLimit).toBe(5);
  });
});
