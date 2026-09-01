/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidSignalWindowError } from './errors';
import { resolveSignalWindow } from './window';

const NOW = new Date('2026-09-01T12:00:00.000Z');

describe('resolveSignalWindow', () => {
  it('resolves relative date math against the given clock', () => {
    expect(resolveSignalWindow({ type: 'relative', from: 'now-7d' }, NOW)).toEqual({
      from: '2026-08-25T12:00:00.000Z',
      to: '2026-09-01T12:00:00.000Z',
    });
  });

  it('passes an absolute window through unchanged', () => {
    expect(
      resolveSignalWindow({ type: 'absolute', from: '2026-01-01T00:00:00.000Z' }, NOW)
    ).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-09-01T12:00:00.000Z',
    });
  });

  it('falls back to the default window when none is configured', () => {
    expect(resolveSignalWindow(undefined, NOW)).toEqual({
      from: '2026-08-02T12:00:00.000Z',
      to: '2026-09-01T12:00:00.000Z',
    });
  });

  it('rejects date math it cannot resolve', () => {
    expect(() => resolveSignalWindow({ type: 'relative', from: 'yesterday' }, NOW)).toThrow(
      InvalidSignalWindowError
    );
  });
});
