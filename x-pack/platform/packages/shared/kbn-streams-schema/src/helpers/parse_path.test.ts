/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parsePath } from './parse_path';

describe('parsePath', () => {
  // Test case for simple dot notation
  it('should parse simple dot notation correctly', () => {
    const input = 'resource.attributes';
    const expected: string[] = ['resource', 'attributes'];
    expect(parsePath(input)).toEqual(expected);
  });

  // Test case for bracket notation with double quotes
  it('should parse bracket notation with double quotes correctly', () => {
    const input = 'attributes["something.that.can.have.dots"]';
    const expected: string[] = ['attributes', 'something.that.can.have.dots'];
    expect(parsePath(input)).toEqual(expected);
  });

  // Test case for bracket notation with single quotes
  it('should parse bracket notation with single quotes correctly', () => {
    const input = "attributes['something.that.can.have.dots']";
    const expected: string[] = ['attributes', 'something.that.can.have.dots'];
    expect(parsePath(input)).toEqual(expected);
  });

  // Test case for mixed dot and bracket notation
  it('should parse mixed dot and bracket notation correctly', () => {
    const input = 'attributes["something.that.can.have.dots"][\'single_quotes_are_ok\']';
    const expected: string[] = [
      'attributes',
      'something.that.can.have.dots',
      'single_quotes_are_ok',
    ];
    expect(parsePath(input)).toEqual(expected);
  });

  // Test case for multiple dot notations
  it('should parse multiple dot notations correctly', () => {
    const input = 'body.structured.direct_access_OK_too';
    const expected: string[] = ['body', 'structured', 'direct_access_OK_too'];
    expect(parsePath(input)).toEqual(expected);
  });

  // Test case for empty string within brackets
  it('should handle an empty string within brackets', () => {
    const input = `attributes[""]`;
    const expected: string[] = ['attributes', ''];
    expect(parsePath(input)).toEqual(expected);
  });

  // Test case for a single segment identifier
  it('should handle a single segment without dots or brackets', () => {
    const input = 'first';
    const expected: string[] = ['first'];
    expect(parsePath(input)).toEqual(expected);
  });

  // Test case for empty input string
  it('should return an empty array for an empty input string', () => {
    const input = '';
    const expected: string[] = [];
    expect(parsePath(input)).toEqual(expected);
  });

  // Optional: Add more complex mixed cases if desired
  it('should handle complex combinations of notations', () => {
    const input = 'root["a.b"].c.d[\'e.f.g\'].h';
    const expected: string[] = ['root', 'a.b', 'c', 'd', 'e.f.g', 'h'];
    expect(parsePath(input)).toEqual(expected);
  });

  it('should handle segments starting directly with brackets', () => {
    const input = '["first.segment"]';
    const expected: string[] = ['first.segment'];
    expect(parsePath(input)).toEqual(expected);
  });
});
