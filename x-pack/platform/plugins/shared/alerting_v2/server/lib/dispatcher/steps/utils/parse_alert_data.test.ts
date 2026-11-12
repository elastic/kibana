/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAlertDataForMatching } from './parse_alert_data';

describe('parseAlertDataForMatching', () => {
  it('returns empty object for malformed JSON', () => {
    expect(parseAlertDataForMatching('{not valid')).toEqual({});
  });

  it('returns empty object for JSON array', () => {
    expect(parseAlertDataForMatching('[1,2,3]')).toEqual({});
  });

  it('returns empty object for JSON null', () => {
    expect(parseAlertDataForMatching('null')).toEqual({});
  });

  it('filters out non-primitive values', () => {
    expect(parseAlertDataForMatching('{"a":"ok","b":{"nested":true},"c":[1]}')).toEqual({
      a: 'ok',
    });
  });

  it('keeps string, number, and boolean values', () => {
    expect(parseAlertDataForMatching('{"s":"str","n":42,"b":true}')).toEqual({
      s: 'str',
      n: 42,
      b: true,
    });
  });

  it('unflattens dot-separated keys into nested objects', () => {
    expect(parseAlertDataForMatching('{"host.name":"my-host.com","host.ip":"10.0.0.1"}')).toEqual({
      host: { name: 'my-host.com', ip: '10.0.0.1' },
    });
  });

  it('handles mixed flat and dot-separated keys', () => {
    expect(parseAlertDataForMatching('{"severity":"critical","host.name":"srv-01"}')).toEqual({
      severity: 'critical',
      host: { name: 'srv-01' },
    });
  });

  it('handles deeply nested dot-separated keys', () => {
    expect(parseAlertDataForMatching('{"a.b.c":"deep"}')).toEqual({
      a: { b: { c: 'deep' } },
    });
  });

  it('returns empty object when unflattening throws (dotted key collides with array semantics)', () => {
    // `a.0` makes `set` create an array for `a`, then `a.length` assigns an
    // invalid length and throws RangeError. Valid JSON, so it clears the JSON
    // parse guard and exercises the unflattening boundary.
    expect(parseAlertDataForMatching('{"a.0":"x","a.length":-1}')).toEqual({});
  });
});
