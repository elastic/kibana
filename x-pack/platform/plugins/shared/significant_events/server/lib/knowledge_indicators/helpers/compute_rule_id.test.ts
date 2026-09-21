/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeRuleId } from './compute_rule_id';

const ESQL = 'FROM logs-* | WHERE status >= 500';

describe('computeRuleId', () => {
  it('is deterministic for the same inputs', () => {
    expect(computeRuleId('default', 'source-a', 'q-1', ESQL)).toBe(
      computeRuleId('default', 'source-a', 'q-1', ESQL)
    );
  });

  it('returns a v5 uuid', () => {
    expect(computeRuleId('default', 'source-a', 'q-1', ESQL)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('changes when the space changes, so the same source id in two spaces cannot collide', () => {
    expect(computeRuleId('default', 'source-a', 'q-1', ESQL)).not.toBe(
      computeRuleId('marketing', 'source-a', 'q-1', ESQL)
    );
  });

  it('changes when the source, query id or esql changes', () => {
    const base = computeRuleId('default', 'source-a', 'q-1', ESQL);

    expect(computeRuleId('default', 'source-b', 'q-1', ESQL)).not.toBe(base);
    expect(computeRuleId('default', 'source-a', 'q-2', ESQL)).not.toBe(base);
    expect(computeRuleId('default', 'source-a', 'q-1', `${ESQL} AND host IS NOT NULL`)).not.toBe(
      base
    );
  });
});
