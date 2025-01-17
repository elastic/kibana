/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatBytes } from './format_bytes';

const exponentN = (number: number, exponent: number) => number ** exponent;

describe('formatBytes', () => {
  it('should format bytes to human readable format with decimal', () => {
    expect(formatBytes(84 + 5)).toBe('89.0 B');
    expect(formatBytes(1024 + 256)).toBe('1.3 KB');
    expect(formatBytes(1024 + 582)).toBe('1.6 KB');
    expect(formatBytes(exponentN(1024, 2) + 582 * 1024)).toBe('1.6 MB');
    expect(formatBytes(exponentN(1024, 3) + 582 * exponentN(1024, 2))).toBe('1.6 GB');
    expect(formatBytes(exponentN(1024, 4) + 582 * exponentN(1024, 3))).toBe('1.6 TB');
    expect(formatBytes(exponentN(1024, 5) + 582 * exponentN(1024, 4))).toBe('1.6 PB');
    expect(formatBytes(exponentN(1024, 6) + 582 * exponentN(1024, 5))).toBe('1.6 EB');
    expect(formatBytes(exponentN(1024, 7) + 582 * exponentN(1024, 6))).toBe('1.6 ZB');
    expect(formatBytes(exponentN(1024, 8) + 582 * exponentN(1024, 7))).toBe('1.6 YB');
  });
});
