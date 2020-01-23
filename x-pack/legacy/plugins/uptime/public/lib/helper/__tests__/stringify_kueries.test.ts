/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringifyKueries } from '../stringify_kueries';

describe('stringifyKueries', () => {
  let kueries: Map<string, number[] | string[]>;
  beforeEach(() => {
    kueries = new Map<string, number[] | string[]>();
    kueries.set('foo', ['fooValue1', 'fooValue2']);
    kueries.set('bar', ['barValue']);
  });

  it('stringifies the current values', () => {
    expect(stringifyKueries(kueries)).toMatchSnapshot();
  });

  it('correctly stringifies a single value', () => {
    kueries = new Map<string, string[]>();
    kueries.set('foo', ['fooValue']);
    expect(stringifyKueries(kueries)).toMatchSnapshot();
  });

  it('returns an empty string for an empty map', () => {
    expect(stringifyKueries(new Map<string, string[]>())).toMatchSnapshot();
  });

  it('returns an empty string for an empty value', () => {
    kueries = new Map<string, string[]>();
    kueries.set('aField', ['']);
    expect(stringifyKueries(kueries)).toMatchSnapshot();
  });

  it('adds quotations if the value contains a space', () => {
    kueries.set('baz', ['baz value']);
    expect(stringifyKueries(kueries)).toMatchSnapshot();
  });

  it('adds quotations inside parens if there are values containing spaces', () => {
    kueries.set('foo', ['foo value 1', 'foo value 2']);
    expect(stringifyKueries(kueries)).toMatchSnapshot();
  });

  it('handles parens for values with greater than 2 items', () => {
    kueries.set('foo', ['val1', 'val2', 'val3']);
    kueries.set('baz', ['baz 1', 'baz 2']);
    expect(stringifyKueries(kueries)).toMatchSnapshot();
  });

  it('handles number values', () => {
    kueries.set('port', [80, 8080, 443]);
    expect(stringifyKueries(kueries)).toMatchSnapshot();
  });

  it('handles colon characters in values', () => {
    kueries.set('monitor.id', ['https://elastic.co', 'https://example.com']);
    expect(stringifyKueries(kueries)).toMatchSnapshot();
  });
});
