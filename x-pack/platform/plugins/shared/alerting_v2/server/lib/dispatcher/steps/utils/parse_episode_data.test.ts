/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDataJson } from './parse_episode_data';

describe('parseDataJson', () => {
  it('parses valid JSON object', () => {
    expect(parseDataJson('{"severity":"critical","count":5}')).toEqual({
      severity: 'critical',
      count: 5,
    });
  });

  it('returns empty object for malformed JSON', () => {
    expect(parseDataJson('{not valid')).toEqual({});
  });

  it('returns empty object for JSON array', () => {
    expect(parseDataJson('[1,2,3]')).toEqual({});
  });

  it('returns empty object for JSON null', () => {
    expect(parseDataJson('null')).toEqual({});
  });

  it('filters out non-primitive values', () => {
    expect(parseDataJson('{"a":"ok","b":{"nested":true},"c":[1]}')).toEqual({ a: 'ok' });
  });

  it('keeps string, number, and boolean values', () => {
    expect(parseDataJson('{"s":"str","n":42,"b":true}')).toEqual({ s: 'str', n: 42, b: true });
  });

  it('unflattens dot-separated keys into nested objects', () => {
    expect(parseDataJson('{"host.name":"my-host.com","host.ip":"10.0.0.1"}')).toEqual({
      host: { name: 'my-host.com', ip: '10.0.0.1' },
    });
  });

  it('handles mixed flat and dot-separated keys', () => {
    expect(parseDataJson('{"severity":"critical","host.name":"srv-01"}')).toEqual({
      severity: 'critical',
      host: { name: 'srv-01' },
    });
  });

  it('handles deeply nested dot-separated keys', () => {
    expect(parseDataJson('{"a.b.c":"deep"}')).toEqual({
      a: { b: { c: 'deep' } },
    });
  });
});
