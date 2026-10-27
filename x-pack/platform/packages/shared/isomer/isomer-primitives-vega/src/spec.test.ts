/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hardenVegaSpec, MAX_SPEC_DEPTH, specIssues, type SpecObject, stripSpec } from './spec';

const paths = (spec: SpecObject) => specIssues(spec).map(({ path }) => path.join('.'));

describe('specIssues', () => {
  it.each([
    ['a Vega-Lite data source', { data: { url: 'cars.json' } }, 'data.url'],
    ['a Vega data source', { data: [{ name: 't', url: 'x' }] }, 'data.0.url'],
    [
      'a signal-valued URL',
      { data: [{ name: 't', url: { signal: "'https://x'" } }] },
      'data.0.url',
    ],
    [
      'a lookup',
      {
        transform: [{ lookup: 'id', from: { data: { url: 'x.csv' }, key: 'id' } }],
      },
      'transform.0.from.data.url',
    ],
    ['a layer', { layer: [{ data: { url: 'x' }, mark: 'bar' }] }, 'layer.0.data.url'],
    ['a facet', { facet: { row: { field: 'a' } }, spec: { data: { url: 'x' } } }, 'spec.data.url'],
    [
      'an image mark',
      {
        marks: [{ type: 'image', encode: { enter: { url: { value: 'x' } } } }],
      },
      'marks.0.encode.enter.url',
    ],
    [
      'a Vega-Lite url channel',
      { mark: 'image', encoding: { url: { field: 'img' } } },
      'encoding.url',
    ],
  ])('reports %s', (_name, spec, path) => {
    expect(paths(spec)).toEqual([path]);
  });

  it.each([
    ['an encoding channel', { encoding: { href: { field: 'link' } } }],
    ['a mark property', { mark: { type: 'bar', href: 'https://x' } }],
    ['a config default', { config: { mark: { href: 'https://x' } } }],
    ['a Vega encode block', { marks: [{ encode: { update: { href: { signal: 'datum.u' } } } }] }],
  ])('reports an href in %s', (_name, spec) => {
    expect(specIssues(spec)).toHaveLength(1);
    expect(specIssues(spec)[0]?.path.at(-1)).toBe('href');
  });

  it('reports a bound input that targets an element by selector', () => {
    expect(
      paths({
        params: [{ name: 'p', bind: { input: 'range', element: '#host-form' } }],
      })
    ).toEqual(['params.0.bind.element']);
  });

  it('reads inline rows as data, not spec', () => {
    expect(
      specIssues({
        data: { values: [{ url: 'https://x', href: 'https://y' }] },
        datasets: { t: [{ url: 'z' }] },
      })
    ).toEqual([]);
    expect(specIssues({ data: [{ name: 't', values: { url: 'x' } }] })).toEqual([]);
  });

  it('reports a spec nested past the depth limit', () => {
    let deep: SpecObject = {};
    for (let i = 0; i <= MAX_SPEC_DEPTH; i += 1) {
      deep = { a: deep };
    }
    expect(specIssues(deep)).toHaveLength(1);
  });
});

describe('stripSpec', () => {
  it('removes everything specIssues reports, and usermeta', () => {
    const spec = {
      usermeta: { embedOptions: { actions: true } },
      data: { url: 'x', values: [{ url: 'kept' }] },
      encoding: { href: { field: 'u' }, x: { field: 'a' } },
      params: [{ name: 'p', bind: { input: 'range', element: '#x' } }],
    };
    expect(stripSpec(spec)).toEqual({
      data: { values: [{ url: 'kept' }] },
      encoding: { x: { field: 'a' } },
      params: [{ name: 'p', bind: { input: 'range' } }],
    });
  });

  it('keeps a keyword cursor and drops any other', () => {
    expect(
      stripSpec({
        mark: { type: 'bar', cursor: 'pointer' },
        encode: {
          a: { cursor: { value: 'move' } },
          b: { cursor: { value: 'url(https://evil/c.png), auto' } },
          c: { cursor: { signal: 'datum.c' } },
        },
      })
    ).toEqual({
      mark: { type: 'bar', cursor: 'pointer' },
      encode: { a: { cursor: { value: 'move' } }, b: {}, c: {} },
    });
  });

  it('keeps a JSON __proto__ key as data', () => {
    const spec = JSON.parse('{"__proto__": {"polluted": true}, "mark": "bar"}') as SpecObject;
    const stripped = stripSpec(spec);
    expect(Object.getPrototypeOf(stripped)).toBe(Object.prototype);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(Object.keys(stripped)).toContain('__proto__');
  });

  it('keeps a __proto__ key in inline rows as data, in a fresh copy of the rows', () => {
    const spec = JSON.parse(
      '{"data": [{"name": "t", "values": [{"__proto__": {"polluted": true}, "a": 1}]}]}'
    ) as SpecObject;
    const [row] = ((stripSpec(spec).data as SpecObject[])[0].values as SpecObject[]) ?? [];
    expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
    expect(Object.keys(row)).toEqual(['__proto__', 'a']);
    expect(row).not.toBe(((spec.data as SpecObject[])[0].values as SpecObject[])[0]);
  });
});

describe('hardenVegaSpec', () => {
  it('bars selector event streams even when the spec allows them', () => {
    expect(
      hardenVegaSpec({
        config: { events: { selector: true, view: ['click'] } },
      }).config
    ).toEqual({
      events: { selector: false, globalCursor: false, view: ['click'] },
    });
  });
});
