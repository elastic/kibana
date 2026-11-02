/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InputCellDefinition, InputDefinition } from '../../common/types';
import { buildQueryParams, resolveInputParams } from './params';
import type { CellOutput } from './types';

const input = (name: string, definition: InputDefinition): InputCellDefinition => ({
  id: `${name}-id`,
  name,
  type: 'input',
  input: definition,
});

const NOW = new Date('2026-10-29T12:34:56.789Z');

describe('resolveInputParams', () => {
  const pinnedTime = input('time', {
    kind: 'time',
    pinned: true,
    defaultValue: { from: 'now-15m', to: 'now' },
  });

  it('resolves relative pinned time against now, rounding the end up', () => {
    expect(
      resolveInputParams(
        pinnedTime,
        { kind: 'time', range: { from: 'now-1h/h', to: 'now/h' } },
        NOW
      )
    ).toEqual({
      _tstart: '2026-10-29T11:00:00.000Z',
      _tend: '2026-10-29T12:59:59.999Z',
    });
  });

  it('passes absolute times through as ISO strings', () => {
    expect(
      resolveInputParams(
        pinnedTime,
        {
          kind: 'time',
          range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
        },
        NOW
      )
    ).toEqual({ _tstart: '2026-01-01T00:00:00.000Z', _tend: '2026-01-02T00:00:00.000Z' });
  });

  it('names unpinned time params after the input', () => {
    const window = input('window', { kind: 'time', defaultValue: { from: 'now-1h', to: 'now' } });
    expect(
      resolveInputParams(window, { kind: 'time', range: { from: 'now-1h', to: 'now' } }, NOW)
    ).toEqual({ window_start: '2026-10-29T11:34:56.789Z', window_end: '2026-10-29T12:34:56.789Z' });
  });

  it('throws a readable error for an unparseable date', () => {
    expect(() =>
      resolveInputParams(pinnedTime, { kind: 'time', range: { from: 'yesterday', to: 'now' } }, NOW)
    ).toThrow(/yesterday/);
  });

  it('binds the dropdown value, and null when empty', () => {
    const os = input('os', { kind: 'dropdown', optionsQuery: '', defaultValue: null });
    expect(resolveInputParams(os, { kind: 'dropdown', value: 'win 7' }, NOW)).toEqual({
      os: 'win 7',
    });
    expect(resolveInputParams(os, { kind: 'dropdown', value: null }, NOW)).toEqual({ os: null });
  });

  it('binds range bounds, and null for both when empty', () => {
    const bytes = input('bytes', { kind: 'range', min: 0, max: 100, defaultValue: null });
    expect(resolveInputParams(bytes, { kind: 'range', value: [10, 20] }, NOW)).toEqual({
      bytes_min: 10,
      bytes_max: 20,
    });
    expect(resolveInputParams(bytes, { kind: 'range', value: null }, NOW)).toEqual({
      bytes_min: null,
      bytes_max: null,
    });
  });
});

describe('buildQueryParams', () => {
  const inputOutput = (params: Record<string, string | number | null>): CellOutput => ({
    kind: 'input',
    params,
  });

  it('binds exactly the params the query references', () => {
    expect(
      buildQueryParams('FROM logs | WHERE @timestamp >= ?_tstart AND os == ?os', [
        inputOutput({ _tstart: '2026-01-01T00:00:00.000Z', _tend: '2026-01-02T00:00:00.000Z' }),
        inputOutput({ os: 'win 7' }),
        inputOutput({ bytes_min: 1, bytes_max: 2 }),
      ])
    ).toEqual({ _tstart: '2026-01-01T00:00:00.000Z', os: 'win 7' });
  });

  it('keeps null values bound', () => {
    expect(
      buildQueryParams('FROM logs | WHERE ?os IS NULL OR os == ?os', [inputOutput({ os: null })])
    ).toEqual({ os: null });
  });

  it('binds null for a referenced param no parent provides', () => {
    expect(buildQueryParams('FROM logs | WHERE os == ?os', [undefined])).toEqual({ os: null });
  });
});
