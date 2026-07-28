/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaSavedObjectPermissions } from './kibana_saved_object';

describe('kibanaSavedObjectPermissions', () => {
  it('returns the standard `saved_object:<type>/get` privilege', () => {
    expect(kibanaSavedObjectPermissions({ savedObjectType: 'lens' })).toEqual({
      kibana: { privileges: [{ name: 'saved_object:lens/get' }] },
    });
  });

  it('builds the privilege from the supplied SO type id (dashboard vs lens vs custom)', () => {
    expect(
      kibanaSavedObjectPermissions({ savedObjectType: 'dashboard' }).kibana.privileges
    ).toEqual([{ name: 'saved_object:dashboard/get' }]);
    expect(
      kibanaSavedObjectPermissions({ savedObjectType: 'custom-type' }).kibana.privileges
    ).toEqual([{ name: 'saved_object:custom-type/get' }]);
  });

  it('returns a fresh object on each call so callers can safely mutate the inner arrays', () => {
    const first = kibanaSavedObjectPermissions({ savedObjectType: 'lens' });
    const second = kibanaSavedObjectPermissions({ savedObjectType: 'lens' });

    expect(first).not.toBe(second);
    expect(first.kibana).not.toBe(second.kibana);
    expect(first.kibana.privileges).not.toBe(second.kibana.privileges);

    // Mutating the first result must not affect the second — SML types that
    // want to append extra privileges should be safe to do so without
    // aliasing across call sites.
    first.kibana.privileges.push({ name: 'extra' });
    expect(second.kibana.privileges).toEqual([{ name: 'saved_object:lens/get' }]);
  });

  it('throws when savedObjectType is empty', () => {
    expect(() => kibanaSavedObjectPermissions({ savedObjectType: '' })).toThrow(
      'kibanaSavedObjectPermissions: savedObjectType is required'
    );
  });
});
