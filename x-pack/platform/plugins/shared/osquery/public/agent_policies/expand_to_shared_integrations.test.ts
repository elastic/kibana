/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expandToSharedIntegrations } from './expand_to_shared_integrations';

describe('expandToSharedIntegrations', () => {
  const groups = {
    pp1: { policyIds: ['A', 'B'] },
    pp2: { policyIds: ['C', 'D'] },
  };

  it('adds every agent policy of the integrations a selected policy belongs to', () => {
    expect([...expandToSharedIntegrations(['A'], groups)].sort()).toEqual(['A', 'B']);
  });

  it('keeps ids that are in no group', () => {
    expect([...expandToSharedIntegrations(['A', 'Z'], groups)].sort()).toEqual(['A', 'B', 'Z']);
  });

  it('returns the input unchanged without groups or selection', () => {
    expect([...expandToSharedIntegrations(['A'], undefined)]).toEqual(['A']);
    expect(expandToSharedIntegrations([], groups).size).toBe(0);
  });
});
