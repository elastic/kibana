/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_ENRICHMENT_WORKFLOW_ID,
  CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
  CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_WIKI_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  DREAMING_KI_TYPE_FILTER_PATTERN,
  dreamingBuildsAnything,
  dreamingTypesOf,
  dreamsAtAll,
  dreamsEnrichment,
  dreamsOnMemories,
  dreamsWiki,
  isDreamedKiType,
  isDreamingAutomation,
  isDreamingConfigured,
  kiTypeFiltersOf,
  matchesKiTypeFilters,
  validateDreamingConfig,
  validateDreamingTypes,
} from './dreaming';

const customer = { type: 'customer', attributes: ['tier'] };
const city = { type: 'city' };

describe('dreamingTypesOf', () => {
  it('returns the facts, entities and relationships a config builds', () => {
    expect(
      dreamingTypesOf({
        facts: [{ type: 'preference' }],
        entities: { nodes: [customer, city] },
        relationships: [{ type: 'lives_in' }],
      })
    ).toEqual({
      facts: [{ type: 'preference' }],
      entities: [customer, city],
      relationships: [{ type: 'lives_in' }],
    });
  });

  it('treats missing and null kinds as empty', () => {
    expect(dreamingTypesOf({ facts: null, entities: null, relationships: null })).toEqual({
      facts: [],
      entities: [],
      relationships: [],
    });
  });

  it('returns no relationships without entity types', () => {
    expect(
      dreamingTypesOf({
        facts: [{ type: 'preference' }],
        entities: { nodes: [] },
        relationships: [{ type: 'lives_in' }],
      }).relationships
    ).toEqual([]);
    expect(
      dreamingTypesOf({ facts: [{ type: 'preference' }], relationships: [{ type: 'lives_in' }] })
        .relationships
    ).toEqual([]);
  });
});

describe('dreamingBuildsAnything', () => {
  it('is true with a fact type or an entity type', () => {
    expect(dreamingBuildsAnything({ facts: [{ type: 'preference' }] })).toBe(true);
    expect(dreamingBuildsAnything({ entities: { nodes: [city] } })).toBe(true);
  });

  it('is false with neither, since relationships need facts or entities to link', () => {
    expect(dreamingBuildsAnything({})).toBe(false);
    expect(dreamingBuildsAnything({ facts: [], entities: { nodes: [] } })).toBe(false);
    expect(dreamingBuildsAnything({ relationships: [{ type: 'lives_in' }] })).toBe(false);
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

describe('isDreamingAutomation', () => {
  const workflow = (definitionId: string) => ({
    type: 'workflow' as const,
    value: `${definitionId}-my_index-0123456789ab`,
  });

  it('matches the workflows dreaming attaches to an AI index', () => {
    expect(isDreamingAutomation(workflow(CONTEXT_ENGINE_DREAMING_WORKFLOW_ID))).toBe(true);
    expect(isDreamingAutomation(workflow(CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID))).toBe(true);
    expect(isDreamingAutomation(workflow(CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID))).toBe(true);
    expect(isDreamingAutomation(workflow(CONTEXT_ENGINE_ENRICHMENT_WORKFLOW_ID))).toBe(true);
    expect(isDreamingAutomation(workflow(CONTEXT_ENGINE_WIKI_WORKFLOW_ID))).toBe(true);
  });

  it('does not match other workflows', () => {
    expect(isDreamingAutomation(workflow(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID))).toBe(
      false
    );
    expect(isDreamingAutomation({ type: 'workflow', value: 'my-dreaming-workflow' })).toBe(false);
  });
});

describe('isDreamingConfigured', () => {
  it('is set up when dreaming is on, or paused with a type to build', () => {
    expect(isDreamingConfigured({ enabled: true })).toBe(true);
    expect(isDreamingConfigured({ enabled: false, facts: [{ type: 'preference' }] })).toBe(true);
  });

  it('is set up when paused with enrichment or wiki pages on', () => {
    expect(isDreamingConfigured({ enabled: false, enrichment: { enabled: true } })).toBe(true);
    expect(isDreamingConfigured({ enabled: false, wiki: { enabled: true } })).toBe(true);
  });

  it('is not set up without a config, or switched off with nothing to build', () => {
    expect(isDreamingConfigured(undefined)).toBe(false);
    expect(isDreamingConfigured({ enabled: false })).toBe(false);
    expect(
      isDreamingConfigured({ enabled: false, enrichment: { enabled: false }, wiki: null })
    ).toBe(false);
  });
});

describe('what dreaming runs', () => {
  const facts = [{ type: 'preference' }];

  it('dreams on memories only when on and building facts or entities', () => {
    expect(dreamsOnMemories({ enabled: true, facts })).toBe(true);
    expect(dreamsOnMemories({ enabled: true, enrichment: { enabled: true } })).toBe(false);
    expect(dreamsOnMemories({ enabled: false, facts })).toBe(false);
    expect(dreamsOnMemories(undefined)).toBe(false);
  });

  it('enriches and builds wiki pages only when on, whatever it builds from memories', () => {
    expect(dreamsEnrichment({ enabled: true, enrichment: { enabled: true } })).toBe(true);
    expect(dreamsEnrichment({ enabled: false, enrichment: { enabled: true } })).toBe(false);
    expect(dreamsEnrichment({ enabled: true, facts, enrichment: null })).toBe(false);
    expect(dreamsWiki({ enabled: true, wiki: { enabled: true } })).toBe(true);
    expect(dreamsWiki({ enabled: true, wiki: { enabled: false } })).toBe(false);
  });

  it('runs at all when any of them runs', () => {
    expect(dreamsAtAll({ enabled: true, facts })).toBe(true);
    expect(dreamsAtAll({ enabled: true, wiki: { enabled: true } })).toBe(true);
    expect(dreamsAtAll({ enabled: true })).toBe(false);
    expect(dreamsAtAll({ enabled: false, facts, wiki: { enabled: true } })).toBe(false);
  });
});

describe('KI type filters', () => {
  it('defaults to every fact and entity', () => {
    expect(kiTypeFiltersOf(undefined)).toEqual(['fact.*', 'entity.*']);
    expect(kiTypeFiltersOf({ ki_types: [] })).toEqual(['fact.*', 'entity.*']);
    expect(kiTypeFiltersOf({ ki_types: ['document'] })).toEqual(['document']);
  });

  it('matches exact types and prefixes, never relationships', () => {
    expect(matchesKiTypeFilters('fact.preference', ['fact.*'])).toBe(true);
    expect(matchesKiTypeFilters('factual', ['fact.*'])).toBe(false);
    expect(matchesKiTypeFilters('entity.customer', ['entity.customer'])).toBe(true);
    expect(matchesKiTypeFilters('entity.city', ['entity.customer'])).toBe(false);
    expect(matchesKiTypeFilters('memory.relationship', ['memory.*'])).toBe(false);
  });

  it('takes exact types and prefixes as filters', () => {
    expect(
      ['fact.*', 'entity.customer', 'document', 'memory.session_fact'].every((filter) =>
        DREAMING_KI_TYPE_FILTER_PATTERN.test(filter)
      )
    ).toBe(true);
    expect(
      ['*', 'fact*', 'Fact.x', 'fact..x', 'fact.*.x', ''].some((filter) =>
        DREAMING_KI_TYPE_FILTER_PATTERN.test(filter)
      )
    ).toBe(false);
  });
});

describe('validateDreamingConfig', () => {
  it('checks the types, and KI type filters listed twice', () => {
    expect(validateDreamingConfig({ facts: [{ type: 'a' }, { type: 'a' }] })).toBe(
      "Fact type 'a' is listed twice."
    );
    expect(
      validateDreamingConfig({ enrichment: { enabled: true, ki_types: ['fact.*', 'fact.*'] } })
    ).toBe("Enrichment lists KI type 'fact.*' twice.");
    expect(validateDreamingConfig({ wiki: { enabled: true, ki_types: ['x', 'x'] } })).toBe(
      "Wiki lists KI type 'x' twice."
    );
    expect(
      validateDreamingConfig({
        enrichment: { enabled: true, ki_types: ['fact.*'] },
        wiki: { enabled: true, ki_types: ['fact.*'] },
      })
    ).toBeUndefined();
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
    expect(
      validateDreamingTypes({ relationships: [{ type: 'lives_in' }, { type: 'lives_in' }] })
    ).toBe("Relationship type 'lives_in' is listed twice.");
  });

  it('rejects the built-in about relationship type', () => {
    expect(validateDreamingTypes({ relationships: [{ type: 'about' }] })).toBe(
      "Relationship type 'about' is built in."
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
