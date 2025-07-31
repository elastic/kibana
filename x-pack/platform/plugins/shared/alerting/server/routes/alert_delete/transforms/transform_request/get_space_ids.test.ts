/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceIds } from './get_space_ids';

describe('getSpaceIds', () => {
  it('should return undefined when input is undefined', () => {
    const result = getSpaceIds(undefined);
    expect(result).toBeUndefined();
  });

  it('should return the same space id when input is a single string', () => {
    const result = getSpaceIds('space1');
    expect(result).toEqual(['space1']);
  });

  it('should return the same space id when input is an array with one element', () => {
    const result = getSpaceIds(['space1']);
    expect(result).toEqual(['space1']);
  });

  it('should return the same space ids when input is an array with multiple elements', () => {
    const result = getSpaceIds(['space1', 'space2']);
    expect(result).toEqual(['space1', 'space2']);
  });
});
