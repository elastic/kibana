/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultRuleAggregationFactory } from './v1';

describe('getDefaultRuleAggregation', () => {
  it('should return aggregation with default maxTags', () => {
    const result = defaultRuleAggregationFactory();
    expect(result.tags).toEqual({
      terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: 50 },
    });
  });

  it('should return aggregation with custom maxTags', () => {
    const result = defaultRuleAggregationFactory({ maxTags: 100 });
    expect(result.tags).toEqual({
      terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: 100 },
    });
  });
});
