/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getCategoryIds } from './get_category_ids';

describe('getCategoryIds', () => {
  it('should return default category ids when input is undefined', () => {
    const result = getCategoryIds(undefined);
    expect(result).toEqual(['management', 'securitySolution', 'observability']);
  });

  it('should return the same category id when input is a single string', () => {
    const result = getCategoryIds('management');
    expect(result).toEqual(['management']);
  });

  it('should return the same category id when input is an array with one element', () => {
    const result = getCategoryIds(['management']);
    expect(result).toEqual(['management']);
  });

  it('should return the same category ids when input is an array with multiple elements', () => {
    const result = getCategoryIds(['management', 'securitySolution']);
    expect(result).toEqual(['management', 'securitySolution']);
  });
});
