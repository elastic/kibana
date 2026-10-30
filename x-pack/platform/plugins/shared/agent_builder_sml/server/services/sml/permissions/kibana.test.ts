/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPermissions } from './kibana';

describe('kibanaPermissions', () => {
  it('returns the standard `ai_index:<type>/read` action as a single-element list', () => {
    expect(kibanaPermissions({ kiType: 'lens' })).toEqual({
      kibana: { privileges: { name: ['ai_index:lens/read'] } },
    });
  });

  it('builds the action from the supplied KI type id (dashboard vs lens vs custom)', () => {
    expect(kibanaPermissions({ kiType: 'dashboard' }).kibana.privileges).toEqual({
      name: ['ai_index:dashboard/read'],
    });
    expect(kibanaPermissions({ kiType: 'custom-type' }).kibana.privileges).toEqual({
      name: ['ai_index:custom-type/read'],
    });
  });

  it('returns a fresh object on each call so callers cannot share state', () => {
    const first = kibanaPermissions({ kiType: 'lens' });
    const second = kibanaPermissions({ kiType: 'lens' });

    expect(first).not.toBe(second);
    expect(first.kibana).not.toBe(second.kibana);
    expect(first.kibana.privileges).not.toBe(second.kibana.privileges);
  });

  it('throws when kiType is empty', () => {
    expect(() => kibanaPermissions({ kiType: '' })).toThrow(
      'kibanaPermissions: kiType is required'
    );
  });
});
