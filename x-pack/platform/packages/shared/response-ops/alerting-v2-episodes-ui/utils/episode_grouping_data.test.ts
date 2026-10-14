/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  formatGroupingValue,
  formatGroupingValueForDisplay,
  getNonEmptyGroupingFields,
} from './episode_grouping_data';

describe('formatGroupingValueForDisplay', () => {
  it('returns empty string for null and undefined', () => {
    expect(formatGroupingValueForDisplay(null)).toBe('');
    expect(formatGroupingValueForDisplay(undefined)).toBe('');
  });

  it('stringifies primitives', () => {
    expect(formatGroupingValueForDisplay('x')).toBe('x');
    expect(formatGroupingValueForDisplay(42)).toBe('42');
    expect(formatGroupingValueForDisplay(true)).toBe('true');
  });

  it('flattens plain objects into their scalar leaves', () => {
    expect(formatGroupingValueForDisplay({ a: 1 })).toBe('1');
    expect(formatGroupingValueForDisplay({ ip: '10.0.0.1', port: 443 })).toBe('10.0.0.1, 443');
  });

  it('joins array scalars with a comma', () => {
    expect(formatGroupingValueForDisplay([1, 2])).toBe('1, 2');
    expect(formatGroupingValueForDisplay(['10.0.0.1', '10.0.0.2'])).toBe('10.0.0.1, 10.0.0.2');
  });

  it('recursively flattens nested arrays/objects and skips empty leaves', () => {
    expect(formatGroupingValueForDisplay({ host: { ip: '10.0.0.1', name: '' } })).toBe('10.0.0.1');
    expect(formatGroupingValueForDisplay([{ ip: '1.1.1.1' }, { ip: '2.2.2.2' }])).toBe(
      '1.1.1.1, 2.2.2.2'
    );
  });

  it('flattens objects with sequential numeric keys the same as any other object', () => {
    expect(formatGroupingValueForDisplay({ '0': 10, '1': 0, '2': 0, '3': 1 })).toBe('10, 0, 0, 1');
  });
});

describe('formatGroupingValue', () => {
  const createDataViewMock = (
    field: string,
    convertToText: (value: unknown) => string
  ): DataView => {
    const fieldStub = { name: field };
    return {
      getFieldByName: jest.fn((name: string) => (name === field ? fieldStub : undefined)),
      getFormatterForField: jest.fn(() => ({ convertToText })),
    } as unknown as DataView;
  };

  it('returns an empty string for null/undefined regardless of the data view', () => {
    const dataView = createDataViewMock('source.ip', () => 'unused');
    expect(formatGroupingValue('source.ip', null, dataView)).toBe('');
    expect(formatGroupingValue('source.ip', undefined, dataView)).toBe('');
  });

  it('formats the value with the data view field formatter when the field exists', () => {
    const dataView = createDataViewMock('source.ip', (value) => `ip:${String(value)}`);
    expect(formatGroupingValue('source.ip', '10.0.0.1', dataView)).toBe('ip:10.0.0.1');
  });

  it('falls back to the untyped formatter when the field is missing from the data view', () => {
    const dataView = createDataViewMock('source.ip', () => 'should-not-be-used');
    expect(formatGroupingValue('host.name', { name: 'web-01' }, dataView)).toBe('web-01');
  });

  it('falls back when no data view is provided', () => {
    expect(formatGroupingValue('source.ip', ['10.0.0.1', '10.0.0.2'])).toBe('10.0.0.1, 10.0.0.2');
  });

  it('falls back when the formatter throws or returns an unusable value', () => {
    const throwingDataView = createDataViewMock('source.ip', () => {
      throw new Error('boom');
    });
    expect(formatGroupingValue('source.ip', '10.0.0.1', throwingDataView)).toBe('10.0.0.1');

    const objectStringDataView = createDataViewMock('source.ip', () => '[object Object]');
    expect(formatGroupingValue('source.ip', { ip: '10.0.0.1' }, objectStringDataView)).toBe(
      '10.0.0.1'
    );
  });
});

describe('getNonEmptyGroupingFields', () => {
  it('keeps fields whose formatted value is non-empty', () => {
    const data = { host: { name: 'h1' }, 'rule.id': '   x   ' };
    expect(getNonEmptyGroupingFields(['host.name', 'rule.id', 'missing'], data)).toEqual([
      'host.name',
      'rule.id',
    ]);
  });

  it('drops fields that resolve to empty, whitespace-only, or missing values', () => {
    const data = { host: { name: '' }, 'rule.id': '  \t  ', other: 'ok', foobar: '   ' };
    expect(
      getNonEmptyGroupingFields(['host.name', 'rule.id', 'missing', 'other', 'foobar'], data)
    ).toEqual(['other']);
  });
});
