/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleTypeIdsFilter } from './get_rule_type_ids_filter';

describe('getRuleTypeIdsFilter()', () => {
  it('should return a rule type ids filter', () => {
    expect(getRuleTypeIdsFilter(['foo', 'bar'])).toStrictEqual({
      terms: {
        'kibana.alert.rule.rule_type_id': ['foo', 'bar'],
      },
    });
  });

  it('should return undefined if no rule type ids are provided', () => {
    expect(getRuleTypeIdsFilter()).toBeUndefined();
  });

  it('should return undefined if an empty array is provided', () => {
    expect(getRuleTypeIdsFilter([])).toBeUndefined();
  });
});
