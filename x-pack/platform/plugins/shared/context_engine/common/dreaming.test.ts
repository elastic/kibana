/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dreamingBuildsAnything,
  dreamingTypesOf,
  isDreamedKiType,
  isDreamingConfigured,
  validateDreamingTypes,
} from './dreaming';

const customer = { type: 'customer', attributes: ['tier'] };
const city = { type: 'city' };

describe('dreamingTypesOf', () => {
  it('returns the facts and entities a config builds', () => {
    expect(
      dreamingTypesOf({
        facts: [{ type: 'preference' }],
        entities: { nodes: [customer, city] },
      })
    ).toEqual({
      facts: [{ type: 'preference' }],
      entities: [customer, city],
    });
  });

  it('treats missing and null kinds as empty', () => {
    expect(dreamingTypesOf({ facts: null, entities: null })).toEqual({
      facts: [],
      entities: [],
    });
  });
});

describe('dreamingBuildsAnything', () => {
  it('is true with a fact type or an entity type', () => {
    expect(dreamingBuildsAnything({ facts: [{ type: 'preference' }] })).toBe(true);
    expect(dreamingBuildsAnything({ entities: { nodes: [city] } })).toBe(true);
  });

  it('is false with neither', () => {
    expect(dreamingBuildsAnything({})).toBe(false);
    expect(dreamingBuildsAnything({ facts: [], entities: { nodes: [] } })).toBe(false);
  });
});

describe('isDreamedKiType', () => {
  it('matches the fact and entity types dreaming writes', () => {
    expect(isDreamedKiType('fact.preference')).toBe(true);
    expect(isDreamedKiType('entity.customer')).toBe(true);
    expect(isDreamedKiType('memory.session_fact')).toBe(false);
    expect(isDreamedKiType('runbook')).toBe(false);
  });
});

describe('isDreamingConfigured', () => {
  it('is set up when dreaming is on, or paused with a type to build', () => {
    expect(isDreamingConfigured({ enabled: true })).toBe(true);
    expect(isDreamingConfigured({ enabled: false, facts: [{ type: 'preference' }] })).toBe(true);
  });

  it('is not set up without a config, or switched off with nothing to build', () => {
    expect(isDreamingConfigured(undefined)).toBe(false);
    expect(isDreamingConfigured({ enabled: false })).toBe(false);
  });
});

describe('validateDreamingTypes', () => {
  it('accepts a consistent config', () => {
    expect(
      validateDreamingTypes({
        facts: [{ type: 'preference' }],
        entities: { nodes: [customer, city] },
      })
    ).toBeUndefined();
  });

  it('rejects a type listed twice', () => {
    expect(validateDreamingTypes({ facts: [{ type: 'a' }, { type: 'a' }] })).toBe(
      "Fact type 'a' is listed twice."
    );
    expect(validateDreamingTypes({ entities: { nodes: [city, city] } })).toBe(
      "Entity type 'city' is listed twice."
    );
  });

  it('rejects an attribute listed twice', () => {
    expect(
      validateDreamingTypes({
        entities: { nodes: [{ type: 'customer', attributes: ['tier', 'tier'] }] },
      })
    ).toBe("Entity type 'customer' lists attribute 'tier' twice.");
  });
});
