/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { demodata } from './demodata';

const nullFilter = {
  type: 'filter',
  meta: {},
  size: null,
  sort: [],
  and: [],
};

const fn = demodata().fn;
const context = {} as any;

describe('demodata', () => {
  it('ci, different object references', () => {
    const ci1 = fn(nullFilter, { type: 'ci' }, context);
    const ci2 = fn(nullFilter, { type: 'ci' }, context);
    expect(ci1).not.toBe(ci2);
    expect(ci1.rows).not.toBe(ci2.rows);
    expect(ci1.rows[0]).not.toBe(ci2.rows[0]);
  });

  it('shirts, different object references', () => {
    const shirts1 = fn(nullFilter, { type: 'shirts' }, context);
    const shirts2 = fn(nullFilter, { type: 'shirts' }, context);
    expect(shirts1).not.toBe(shirts2);
    expect(shirts1.rows).not.toBe(shirts2.rows);
    expect(shirts1.rows[0]).not.toBe(shirts2.rows[0]);
  });

  it('invalid set', () => {
    expect(() => {
      fn(nullFilter, { type: 'foo' }, context);
    }).toThrowError("Invalid data set: 'foo', use 'ci' or 'shirts'.");
  });
});
