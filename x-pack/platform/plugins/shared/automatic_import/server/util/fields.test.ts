/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldPathToProcessorString } from './fields';

describe('fieldPathToProcessorString', () => {
  it('should join an array of strings with dots', () => {
    const result = fieldPathToProcessorString(['foo', 'bar', 'baz']);
    expect(result).toBe('foo.bar.baz');
  });

  it('should return an empty string if array is empty', () => {
    const result = fieldPathToProcessorString([]);
    expect(result).toBe('');
  });
});
