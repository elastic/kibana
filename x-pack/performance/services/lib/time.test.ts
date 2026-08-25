/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ms, toMs } from './time';

describe('ms()', () => {
  it('converts simple timestrings to milliseconds', () => {
    expect(ms('1s')).toMatchInlineSnapshot(`1000`);
    expect(ms('10s')).toMatchInlineSnapshot(`10000`);
    expect(ms('1m')).toMatchInlineSnapshot(`60000`);
    expect(ms('10m')).toMatchInlineSnapshot(`600000`);
    expect(ms('0.5s')).toMatchInlineSnapshot(`500`);
    expect(ms('0.5m')).toMatchInlineSnapshot(`30000`);
  });
});

describe('toMs()', () => {
  it('converts strings to ms, returns number directly', () => {
    expect(toMs(1000)).toBe(1000);
    expect(toMs('1s')).toBe(1000);
  });
});
