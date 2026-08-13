/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPermissions } from './kibana';

describe('kibanaSavedObjectPermissions', () => {
  it('returns the standard `saved_object:<type>/get` privilege', () => {
    expect(kibanaPermissions({ kiType: 'lens' })).toEqual({
      kibana: { privileges: { name: 'saved_object:lens/get' } },
    });
  });

  it('builds the privilege from the supplied SO type id (dashboard vs lens vs custom)', () => {
    expect(
      kibanaPermissions({ kiType: 'dashboard' }).kibana.privileges
    ).toEqual({ name: 'saved_object:dashboard/get' });
    expect(
      kibanaPermissions({ kiType: 'custom-type' }).kibana.privileges
    ).toEqual({ name: 'saved_object:custom-type/get' });
  });

  it('returns a fresh object on each call so callers cannot share state', () => {
    const first = kibanaPermissions({ kiType: 'lens' });
    const second = kibanaPermissions({ kiType: 'lens' });

    expect(first).not.toBe(second);
    expect(first.kibana).not.toBe(second.kibana);
    expect(first.kibana.privileges).not.toBe(second.kibana.privileges);
  });

  it('throws when savedObjectType is empty', () => {
    expect(() => kibanaPermissions({ kiType: '' })).toThrow(
      'kibanaSavedObjectPermissions: savedObjectType is required'
    );
  });
});
