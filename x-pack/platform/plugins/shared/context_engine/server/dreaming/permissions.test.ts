/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { audienceKeyOf, derivedPermissions, samePermissions } from './permissions';

const restrictedTo = (...groups: Array<{ space: string; name?: string[]; count?: number }>) => ({
  kibana: { privileges: groups },
});

describe('audienceKeyOf', () => {
  it('has no key for open memories', () => {
    expect(audienceKeyOf([undefined, { kibana: { privileges: [] } }])).toBeUndefined();
  });

  it('gives the same key however the same permissions are written', () => {
    expect(
      audienceKeyOf([
        restrictedTo({ space: 'a', name: ['x', 'y'], count: 2 }, { space: 'b', name: ['z'] }),
      ])
    ).toBe(
      audienceKeyOf([
        restrictedTo({ space: 'b', name: ['z'] }, { count: 2, name: ['y', 'x'], space: 'a' }),
        undefined,
      ])
    );
  });

  it('gives different permissions different keys', () => {
    expect(audienceKeyOf([restrictedTo({ space: 'a', name: ['x'] })])).not.toBe(
      audienceKeyOf([restrictedTo({ space: 'a', name: ['y'] })])
    );
  });
});

describe('samePermissions', () => {
  it('counts no privileges as open', () => {
    expect(samePermissions(undefined, { kibana: { privileges: [] } })).toBe(true);
    expect(samePermissions(undefined, restrictedTo({ space: 'a' }))).toBe(false);
  });

  it('matches the same permissions however they are written, as audienceKeyOf does', () => {
    const a = restrictedTo({ space: 'a', name: ['x', 'y'], count: 2 }, { space: 'b', name: ['z'] });
    const b = restrictedTo({ space: 'b', name: ['z'] }, { count: 2, name: ['y', 'x'], space: 'a' });

    expect(samePermissions(a, b)).toBe(true);
    expect(audienceKeyOf([a])).toBe(audienceKeyOf([b]));
    expect(samePermissions(a, restrictedTo({ space: 'a', name: ['x', 'y'], count: 2 }))).toBe(
      false
    );
  });
});

describe('derivedPermissions', () => {
  it('keeps the permissions of sources that have the same ones in a different order', () => {
    const a = restrictedTo({ space: '*', name: ['x', 'y'] });
    const b = restrictedTo({ space: '*', name: ['y', 'x'] });

    expect(derivedPermissions([a, b], 'team-a')).toEqual(a);
  });
});
