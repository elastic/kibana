/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dreamingBuildsAnything,
  dreamingTypesOf,
  isDreamingConfigured,
  validateDreamingTypes,
} from './dreaming';

const customer = { type: 'customer', attributes: ['tier'] };
const city = { type: 'city' };
const livesIn = { type: 'lives_in', source: 'customer', target: 'city' };

describe('dreamingTypesOf', () => {
  it('returns the facts, entities and relationships a config builds', () => {
    expect(
      dreamingTypesOf({
        facts: [{ type: 'preference' }],
        entities: { nodes: [customer, city], edges: [livesIn] },
      })
    ).toEqual({
      facts: [{ type: 'preference' }],
      entities: [customer, city],
      relationships: [livesIn],
    });
  });

  it('builds no relationships without entities', () => {
    expect(dreamingTypesOf({ entities: { nodes: [], edges: [livesIn] } }).relationships).toEqual(
      []
    );
  });

  it('treats missing and null kinds as empty', () => {
    expect(dreamingTypesOf({ facts: null, entities: null })).toEqual({
      facts: [],
      entities: [],
      relationships: [],
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
        entities: { nodes: [customer, city], edges: [livesIn] },
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
    expect(
      validateDreamingTypes({ entities: { nodes: [customer, city], edges: [livesIn, livesIn] } })
    ).toBe("Relationship type 'lives_in' is listed twice.");
  });

  it('rejects an attribute listed twice', () => {
    expect(
      validateDreamingTypes({
        entities: { nodes: [{ type: 'customer', attributes: ['tier', 'tier'] }] },
      })
    ).toBe("Entity type 'customer' lists attribute 'tier' twice.");
  });

  it('rejects a relationship between entity types that are not configured', () => {
    expect(validateDreamingTypes({ entities: { nodes: [customer], edges: [livesIn] } })).toBe(
      "Relationship type 'lives_in' links entity type 'city', which is not configured."
    );
  });
});
