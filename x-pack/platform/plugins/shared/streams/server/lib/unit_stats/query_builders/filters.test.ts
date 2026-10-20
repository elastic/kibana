/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { UNIT_STATS_STREAM } from '../constants';
import { filterByIds, filterByUnitAndWindow, nullifyUnmappedColumns } from './filters';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };

const print = (query: { print: (format: 'basic') => string }) => query.print('basic');

describe('filterByUnitAndWindow', () => {
  it('keeps the unit and the window, with no hash filter by default', () => {
    const query = filterByUnitAndWindow(esql.from(UNIT_STATS_STREAM), {
      unitId: 'default',
      window,
    });

    expect(print(query)).toBe(
      `FROM ${UNIT_STATS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}"`
    );
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = filterByUnitAndWindow(esql.from(UNIT_STATS_STREAM), {
      unitId: 'default',
      window,
      configHash: 'h1',
    });

    expect(print(query)).toContain(' | WHERE resource.attributes.streams.config.hash == "h1"');
  });

  it('escapes quotes and backslashes in values', () => {
    const query = filterByUnitAndWindow(esql.from(UNIT_STATS_STREAM), {
      unitId: 'a"b\\c',
      window,
    });

    expect(print(query)).toContain('resource.attributes.unit.id == "a\\"b\\\\c"');
  });
});

describe('filterByIds', () => {
  it('keeps the documents whose field is one of the ids', () => {
    const query = filterByIds(esql.from(UNIT_STATS_STREAM), 'attributes.streams.destination.id', [
      'es-prod',
      'es-dev',
    ]);

    expect(print(query)).toBe(
      `FROM ${UNIT_STATS_STREAM} | WHERE attributes.streams.destination.id IN ("es-prod", "es-dev")`
    );
  });

  it('escapes quotes in ids and does not read them as columns', () => {
    const query = filterByIds(esql.from(UNIT_STATS_STREAM), 'attributes.streams.step.id', [
      'we"ird',
    ]);

    expect(print(query)).toContain('IN ("we\\"ird")');
    expect(print(query)).not.toContain('`');
  });
});

describe('nullifyUnmappedColumns', () => {
  it('sets unmapped fields to null in the results, not an error', () => {
    const query = nullifyUnmappedColumns(esql.from(UNIT_STATS_STREAM));

    expect(print(query)).toBe(`SET unmapped_fields = "nullify"; FROM ${UNIT_STATS_STREAM}`);
  });
});
