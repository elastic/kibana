/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ChartSelection,
  selectionEvent,
  selectionSchema,
  unknownSelectionKeys,
} from './selection';

const schema = selectionSchema(['x', 'series']);
const accepts = (value: unknown) => schema.safeParse(value).success;

describe('selectionSchema', () => {
  it('takes a predicate with exactly one of value or range', () => {
    const on = (predicate: unknown) => ({
      name: 'select',
      on: { x: { a: [predicate] } },
    });
    expect(accepts(on({ field: 'host', value: 'a' }))).toBe(true);
    expect(accepts(on({ field: 't', range: { gte: 0, lt: 10 } }))).toBe(true);
    expect(accepts(on({ field: 'host' }))).toBe(false);
    expect(accepts(on({ field: 'host', value: 'a', range: { gte: 0, lt: 1 } }))).toBe(false);
  });

  it('takes only the chart’s dimensions', () => {
    expect(accepts({ name: 'select', on: { series: {} } })).toBe(true);
    expect(accepts({ name: 'select', on: { slice: {} } })).toBe(false);
  });

  it('refuses a key bound to no predicates', () => {
    expect(accepts({ name: 'select', on: { x: { a: [] } } })).toBe(false);
  });

  it('keeps `target` and `predicates` out of the passed-through context', () => {
    expect(accepts({ name: 'select', context: { panelId: 'p' } })).toBe(true);
    expect(accepts({ name: 'select', context: { target: 1 } })).toBe(false);
    expect(accepts({ name: 'select', context: { predicates: [] } })).toBe(false);
  });

  it('refuses a context value JSON cannot carry', () => {
    expect(accepts({ name: 'select', context: { at: () => 1 } })).toBe(false);
  });
});

const selection: ChartSelection = {
  name: 'dashboard/select',
  context: { panelId: 'p1' },
  on: {
    x: { 'web-01': [{ field: 'host.name', value: 'web-01' }] },
    series: { '5xx': [{ field: 'status', range: { gte: 500, lt: 600 } }] },
  },
};

describe('selectionEvent', () => {
  it('ANDs the predicates of every dimension in the target and keeps the author’s context', () => {
    expect(selectionEvent(selection, { x: 'web-01', series: '5xx' })).toEqual({
      name: 'dashboard/select',
      context: {
        panelId: 'p1',
        target: { x: 'web-01', series: '5xx' },
        predicates: [
          { field: 'host.name', value: 'web-01' },
          { field: 'status', range: { gte: 500, lt: 600 } },
        ],
      },
    });
  });

  it('still raises the event for a key bound to nothing, with no predicates', () => {
    expect(selectionEvent(selection, { x: 'web-02' }).context).toEqual({
      panelId: 'p1',
      target: { x: 'web-02' },
      predicates: [],
    });
  });

  it('reads only the predicates the author wrote, never inherited ones', () => {
    for (const key of ['constructor', '__proto__', 'toString']) {
      expect(selectionEvent(selection, { x: key, series: key }).context?.predicates).toEqual([]);
    }
  });

  it('collects a path’s predicates root first', () => {
    const nested: ChartSelection = {
      name: 'select',
      on: {
        path: {
          web: [{ field: 'tier', value: 'web' }],
          'web-01': [{ field: 'host', value: 'web-01' }],
        },
      },
    };
    expect(selectionEvent(nested, { path: ['web', 'web-01'] }).context?.predicates).toEqual([
      { field: 'tier', value: 'web' },
      { field: 'host', value: 'web-01' },
    ]);
  });

  it('passes the author’s context through beside the predicates', () => {
    const { name, context } = selectionEvent(selection, { x: 'web-01' });
    expect(name).toBe('dashboard/select');
    expect(context).toMatchObject({
      panelId: 'p1',
      predicates: [{ field: 'host.name', value: 'web-01' }],
    });
  });
});

describe('unknownSelectionKeys', () => {
  it('names keys the data does not declare, per dimension', () => {
    expect(
      unknownSelectionKeys(selection, {
        x: new Set(['web-01']),
        series: new Set(['2xx']),
      })
    ).toEqual(['series.5xx']);
    expect(
      unknownSelectionKeys(selection, {
        x: new Set(['web-01']),
        series: new Set(['5xx']),
      })
    ).toEqual([]);
  });
});
