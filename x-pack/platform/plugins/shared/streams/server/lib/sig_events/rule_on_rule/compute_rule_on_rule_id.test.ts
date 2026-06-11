/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeRuleOnRuleId } from './compute_rule_on_rule_id';

describe('computeRuleOnRuleId', () => {
  const baseRuleId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('is stable for count-based paths', () => {
    expect(computeRuleOnRuleId(baseRuleId)).toBe(computeRuleOnRuleId(baseRuleId));
  });

  it('differs when metric suffix is provided', () => {
    expect(computeRuleOnRuleId(baseRuleId, 'cpu')).not.toEqual(computeRuleOnRuleId(baseRuleId));
  });

  it('differs across metrics', () => {
    expect(computeRuleOnRuleId(baseRuleId, 'cpu')).not.toEqual(
      computeRuleOnRuleId(baseRuleId, 'memory')
    );
  });
});
