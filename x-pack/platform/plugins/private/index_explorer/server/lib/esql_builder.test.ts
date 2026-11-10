/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '../../common/types';
import { buildFilteredSource, quoteIdentifier, toSortCommand, toSource } from './esql_builder';
import { InvalidRequestError } from './errors';

const INDEX = '.kibana-event-log-ds';
const fieldTypes = new Map([
  ['@timestamp', 'date'],
  ['event.action', 'keyword'],
  ['event.duration', 'long'],
  ['message', 'text'],
  ['event.original', 'boolean'],
]);

function build(filters: Filter[], search?: string) {
  return buildFilteredSource({ index: INDEX, filters, search, fieldTypes });
}

describe('quoteIdentifier', () => {
  it('backtick-quotes names and escapes backticks', () => {
    expect(quoteIdentifier('event.action')).toBe('`event.action`');
    expect(quoteIdentifier('a`b')).toBe('`a``b`');
  });
});

describe('toSource', () => {
  it('leaves ordinary index patterns unquoted', () => {
    expect(toSource('.kibana-event-log-*')).toBe('.kibana-event-log-*');
    expect(toSource('remote:logs-*,other')).toBe('remote:logs-*,other');
  });

  it('quotes unusual names and rejects double quotes', () => {
    expect(toSource('weird name')).toBe('"weird name"');
    expect(() => toSource('a"b')).toThrow(InvalidRequestError);
  });
});

describe('buildFilteredSource', () => {
  it('renders only FROM without filters or search', () => {
    expect(build([])).toEqual({ base: `FROM ${INDEX}`, params: [] });
  });

  it('adds METADATA when requested', () => {
    expect(
      buildFilteredSource({ index: INDEX, filters: [], fieldTypes, metadata: ['_id', '_index'] })
        .base
    ).toBe(`FROM ${INDEX} METADATA _id, _index`);
  });

  it('puts the QSTR full-text search in its own WHERE before the filters', () => {
    expect(
      build([{ field: 'event.action', operator: 'exact', value: 'task-run' }], 'failed')
    ).toEqual({
      base: [`FROM ${INDEX}`, '| WHERE QSTR(?p0)', '| WHERE `event.action` == ?p1'].join('\n'),
      params: [
        { name: 'p0', type: 'string', value: 'failed' },
        { name: 'p1', type: 'string', value: 'task-run' },
      ],
    });
  });

  it('types parameters from the column type and converts dates', () => {
    expect(
      build([
        { field: 'event.duration', operator: 'gte', value: '1000' },
        { field: '@timestamp', operator: 'lt', value: '2026-11-03T00:00:00Z' },
        { field: 'event.original', operator: 'exact', value: 'true' },
      ])
    ).toEqual({
      base: [
        `FROM ${INDEX}`,
        '| WHERE `event.duration` >= ?p0 AND `@timestamp` < TO_DATETIME(?p1) AND `event.original` == ?p2',
      ].join('\n'),
      params: [
        { name: 'p0', type: 'number', value: '1000' },
        { name: 'p1', type: 'string', value: '2026-11-03T00:00:00Z' },
        { name: 'p2', type: 'boolean', value: 'true' },
      ],
    });
  });

  it('keeps nulls for "not" and "notin"', () => {
    expect(build([{ field: 'event.action', operator: 'not', value: 'x' }]).base).toContain(
      '(`event.action` IS NULL OR `event.action` != ?p0)'
    );
    expect(build([{ field: 'event.action', operator: 'notin', value: 'a, b' }]).base).toContain(
      '(`event.action` IS NULL OR NOT `event.action` IN (?p0, ?p1))'
    );
  });

  it('uses a case-insensitive, escaped LIKE for "contains" and "startswith"', () => {
    expect(build([{ field: 'message', operator: 'contains', value: 'Disk*Full' }])).toEqual({
      base: `FROM ${INDEX}\n| WHERE TO_LOWER(\`message\`) LIKE ?p0`,
      params: [{ name: 'p0', type: 'string', value: '*disk\\*full*' }],
    });
    expect(
      build([{ field: 'event.action', operator: 'startswith', value: 'task' }]).params
    ).toEqual([{ name: 'p0', type: 'string', value: 'task*' }]);
  });

  it('renders exists and missing without parameters', () => {
    expect(
      build([
        { field: 'message', operator: 'exists', value: '' },
        { field: 'event.action', operator: 'missing', value: '' },
      ])
    ).toEqual({
      base: `FROM ${INDEX}\n| WHERE \`message\` IS NOT NULL AND \`event.action\` IS NULL`,
      params: [],
    });
  });

  it('rejects invalid input', () => {
    expect(() => build([{ field: 'event.duration', operator: 'contains', value: '1' }])).toThrow(
      InvalidRequestError
    );
    expect(() => build([{ field: 'event.duration', operator: 'gt', value: 'abc' }])).toThrow(
      InvalidRequestError
    );
    expect(() => build([{ field: 'event.action', operator: 'in', value: ' , ' }])).toThrow(
      InvalidRequestError
    );
  });
});

describe('toSortCommand', () => {
  it('sorts with nulls last', () => {
    expect(toSortCommand({ field: '@timestamp', direction: 'desc' })).toBe(
      '| SORT `@timestamp` DESC NULLS LAST'
    );
  });
});
