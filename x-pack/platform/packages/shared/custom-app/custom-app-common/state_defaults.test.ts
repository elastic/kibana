/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStateDefaults } from './state_defaults';

describe('getStateDefaults', () => {
  it('returns each key with its declared default', () => {
    expect(
      getStateDefaults({
        service: { type: 'string', default: 'checkout' },
        limit: { type: 'number', default: 0 },
        compact: { type: 'boolean', default: false },
      })
    ).toEqual({ service: 'checkout', limit: 0, compact: false });
  });

  it('returns nothing when no state is declared', () => {
    expect(getStateDefaults({})).toEqual({});
  });
});
