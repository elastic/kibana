/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { getEbtOwner } from './get_ebt_owner';

describe('getEbtOwner', () => {
  it('returns the first owner when it is registered', () => {
    expect(getEbtOwner([SECURITY_SOLUTION_OWNER])).toBe(SECURITY_SOLUTION_OWNER);
  });

  it('returns "unknown" when the owner is not a registered solution', () => {
    expect(getEbtOwner(['not-a-real-owner'])).toBe('unknown');
  });

  it('returns "unknown" when the owner array is empty', () => {
    expect(getEbtOwner([])).toBe('unknown');
  });
});
