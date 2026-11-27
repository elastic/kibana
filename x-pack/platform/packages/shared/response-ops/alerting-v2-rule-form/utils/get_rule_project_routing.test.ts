/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpsPluginMock } from '@kbn/cps/public/mocks';
import { getRuleProjectRouting } from './get_rule_project_routing';

const mockCps = cpsPluginMock.createStartContract();

describe('getRuleProjectRouting', () => {
  it('returns the space default routing when the query does not set one', () => {
    expect(getRuleProjectRouting('FROM logs-*', mockCps)).toBe('_alias:*');
  });

  it('returns the query routing when the query sets one', () => {
    expect(
      getRuleProjectRouting('SET project_routing = "_alias:_origin"; FROM logs-*', mockCps)
    ).toBe('_alias:_origin');
  });

  it('returns undefined without CPS', () => {
    expect(getRuleProjectRouting('FROM logs-*')).toBeUndefined();
  });
});
