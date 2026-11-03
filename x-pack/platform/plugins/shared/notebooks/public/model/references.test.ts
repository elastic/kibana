/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, InputCellDefinition, InputDefinition } from '../../common/types';
import {
  CELL_NAME_PATTERN,
  getCellParamNames,
  getExposedParamNames,
  getQueryParamNames,
} from './references';

const input = (name: string, definition: InputDefinition): InputCellDefinition => ({
  id: `${name}-id`,
  name,
  type: 'input',
  input: definition,
});

describe('getQueryParamNames', () => {
  it('returns value and identifier params without their prefixes', () => {
    expect(
      getQueryParamNames(
        'FROM logs | WHERE os == ?os AND @timestamp >= ?_tstart | STATS BY ??field'
      )
    ).toEqual(expect.arrayContaining(['os', '_tstart', 'field']));
  });

  it('returns each param once', () => {
    const names = getQueryParamNames(
      'FROM logs | WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min) AND bytes <= ?bytes_max'
    );
    expect(names.sort()).toEqual(['bytes_max', 'bytes_min']);
  });

  it('ignores question marks inside string literals and quoted columns', () => {
    expect(getQueryParamNames('FROM logs | WHERE message == "is ?this" | EVAL `?x` = 1')).toEqual(
      []
    );
  });

  it('returns nothing for a query without params', () => {
    expect(getQueryParamNames('FROM logs | LIMIT 10')).toEqual([]);
  });
});

describe('getExposedParamNames', () => {
  it('exposes _tstart and _tend for a pinned time input', () => {
    expect(
      getExposedParamNames(
        input('time', { kind: 'time', pinned: true, defaultValue: { from: 'now-1d', to: 'now' } })
      )
    ).toEqual(['_tstart', '_tend']);
  });

  it('exposes <name>_start and <name>_end for an unpinned time input', () => {
    expect(
      getExposedParamNames(
        input('window', { kind: 'time', defaultValue: { from: 'now-1d', to: 'now' } })
      )
    ).toEqual(['window_start', 'window_end']);
  });

  it('exposes the bare name for a dropdown', () => {
    expect(
      getExposedParamNames(input('os', { kind: 'dropdown', optionsQuery: '', defaultValue: null }))
    ).toEqual(['os']);
  });

  it('exposes <name>_min and <name>_max for a range', () => {
    expect(
      getExposedParamNames(input('bytes', { kind: 'range', min: 0, max: 10, defaultValue: null }))
    ).toEqual(['bytes_min', 'bytes_max']);
  });
});

describe('getCellParamNames', () => {
  it('reads params from an ES|QL query', () => {
    const cell: CellDefinition = {
      id: 'q',
      name: 'q',
      type: 'esql',
      runMode: 'auto',
      query: 'FROM logs | WHERE os == ?os',
    };
    expect(getCellParamNames(cell)).toEqual(['os']);
  });

  it("reads params from a dropdown's options query", () => {
    expect(
      getCellParamNames(
        input('os', {
          kind: 'dropdown',
          optionsQuery: 'FROM logs | WHERE @timestamp >= ?_tstart | STATS BY os',
          defaultValue: null,
        })
      )
    ).toEqual(['_tstart']);
  });

  it('ignores the options query of a static dropdown', () => {
    expect(
      getCellParamNames(
        input('os', {
          kind: 'dropdown',
          optionsSource: 'static',
          optionsQuery: 'FROM logs | WHERE @timestamp >= ?_tstart | STATS BY os',
          staticOptions: ['win'],
          defaultValue: null,
        })
      )
    ).toEqual([]);
  });

  it('returns nothing for charts, markdown, time and range inputs', () => {
    const cells: CellDefinition[] = [
      { id: 'c', name: 'c', type: 'chart', runMode: 'auto', sourceCell: 'q', lensAttributes: null },
      { id: 'm', name: 'm', type: 'markdown', content: 'uses ?os in prose' },
      input('time', { kind: 'time', pinned: true, defaultValue: { from: 'now-1d', to: 'now' } }),
      input('bytes', { kind: 'range', min: 0, max: 10, defaultValue: null }),
    ];
    expect(cells.map(getCellParamNames)).toEqual([[], [], [], []]);
  });
});

describe('CELL_NAME_PATTERN', () => {
  it.each(['os', 'bytes_2', 'a'])('accepts %s', (name) => {
    expect(CELL_NAME_PATTERN.test(name)).toBe(true);
  });

  it.each(['_tstart', 'Os', '2x', 'my-cell', ''])('rejects %p', (name) => {
    expect(CELL_NAME_PATTERN.test(name)).toBe(false);
  });
});
