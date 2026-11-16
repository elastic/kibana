/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dreamingConfigSchema } from './dreaming_schema';

const config = {
  enabled: true,
  schedule: { interval: '1h' },
  instructions: 'Remember what customers report about their flights and what they prefer.',
  connector_id: 'my-connector',
  facts: [{ type: 'preference', description: 'Something a customer likes or wants.' }],
  entities: {
    nodes: [
      { type: 'customer', description: 'A loyalty member.', attributes: ['loyalty_number'] },
      { type: 'city' },
    ],
  },
  relationships: [
    { type: 'lives_in', description: 'A customer lives in a city.' },
    { type: 'knows' },
  ],
};

describe('dreamingConfigSchema', () => {
  it('accepts a full config as it is', () => {
    expect(dreamingConfigSchema.validate(config)).toEqual(config);
  });

  it('accepts dreaming switched off with nothing else', () => {
    expect(dreamingConfigSchema.validate({ enabled: false })).toEqual({ enabled: false });
  });

  it('accepts null facts, entities and relationships', () => {
    expect(
      dreamingConfigSchema.validate({
        enabled: false,
        facts: null,
        entities: null,
        relationships: null,
      })
    ).toEqual({ enabled: false, facts: null, entities: null, relationships: null });
  });

  it('rejects a relationship type name that is not lowercase letters, digits and underscores', () => {
    expect(() =>
      dreamingConfigSchema.validate({ ...config, relationships: [{ type: 'Lives In' }] })
    ).toThrow('Must use lowercase letters, digits, and underscores only.');
  });

  it('bounds the relationship types', () => {
    expect(() =>
      dreamingConfigSchema.validate({
        ...config,
        relationships: Array.from({ length: 51 }, (_, index) => ({ type: `type_${index}` })),
      })
    ).toThrow();
  });

  it('rejects a type name that is not lowercase letters, digits and underscores', () => {
    expect(() =>
      dreamingConfigSchema.validate({ ...config, facts: [{ type: 'Known Issue' }] })
    ).toThrow('Must use lowercase letters, digits, and underscores only.');
  });

  it('rejects an attribute dreaming keeps for itself', () => {
    expect(() =>
      dreamingConfigSchema.validate({
        ...config,
        entities: { nodes: [{ type: 'customer', attributes: ['esql'] }] },
      })
    ).toThrow("'esql' is kept for dreaming's own use.");
  });

  it('rejects an interval shorter than the floor', () => {
    expect(() =>
      dreamingConfigSchema.validate({ ...config, schedule: { interval: '5m' } })
    ).toThrow('Must be at least 15 minutes.');
  });

  it('rejects entity edges, which relationship types replace', () => {
    expect(() =>
      dreamingConfigSchema.validate({
        ...config,
        entities: {
          ...config.entities,
          edges: [{ type: 'lives_in', source: 'customer', target: 'city' }],
        },
      })
    ).toThrow();
  });

  it('bounds the instructions', () => {
    expect(() =>
      dreamingConfigSchema.validate({ ...config, instructions: 'x'.repeat(8193) })
    ).toThrow();
  });

  describe('enrichment and wiki pages', () => {
    const enrichment = {
      enabled: true,
      selection: 'Customers with no tier.',
      improvement: 'The tier and the renewal date.',
      ki_types: ['entity.customer', 'fact.*'],
      max_documents: 20,
      refresh_after: '7d',
    };
    const wiki = {
      enabled: true,
      instructions: 'One page per customer.',
      ki_types: ['fact.*'],
      max_pages: 10,
      research: false,
    };

    it('accepts them as they are, or null', () => {
      expect(dreamingConfigSchema.validate({ ...config, enrichment, wiki })).toEqual({
        ...config,
        enrichment,
        wiki,
      });
      expect(
        dreamingConfigSchema.validate({ enabled: true, enrichment: null, wiki: null })
      ).toEqual({ enabled: true, enrichment: null, wiki: null });
    });

    it('rejects a KI type filter that is neither a type nor a prefix', () => {
      expect(() =>
        dreamingConfigSchema.validate({ ...config, enrichment: { ...enrichment, ki_types: ['*'] } })
      ).toThrow('Must be a KI type');
      expect(() =>
        dreamingConfigSchema.validate({ ...config, wiki: { ...wiki, ki_types: ['Entity.X'] } })
      ).toThrow('Must be a KI type');
    });

    it('rejects a KI type filter listed twice', () => {
      expect(() =>
        dreamingConfigSchema.validate({
          ...config,
          enrichment: { ...enrichment, ki_types: ['fact.*', 'fact.*'] },
        })
      ).toThrow("Enrichment lists KI type 'fact.*' twice.");
    });

    it('bounds how much one run does', () => {
      expect(() =>
        dreamingConfigSchema.validate({
          ...config,
          enrichment: { ...enrichment, max_documents: 51 },
        })
      ).toThrow();
      expect(() =>
        dreamingConfigSchema.validate({
          ...config,
          enrichment: { ...enrichment, max_documents: 0 },
        })
      ).toThrow();
      expect(() =>
        dreamingConfigSchema.validate({ ...config, wiki: { ...wiki, max_pages: 26 } })
      ).toThrow();
    });

    it('rejects a refresh shorter than the dreaming floor, and bounds the prompts', () => {
      expect(() =>
        dreamingConfigSchema.validate({
          ...config,
          enrichment: { ...enrichment, refresh_after: '5m' },
        })
      ).toThrow();
      expect(() =>
        dreamingConfigSchema.validate({
          ...config,
          enrichment: { ...enrichment, improvement: 'x'.repeat(8193) },
        })
      ).toThrow();
      expect(() =>
        dreamingConfigSchema.validate({
          ...config,
          wiki: { ...wiki, instructions: 'x'.repeat(8193) },
        })
      ).toThrow();
    });

    it('requires enabled', () => {
      expect(() =>
        dreamingConfigSchema.validate({ ...config, wiki: { research: true } })
      ).toThrow();
    });
  });
});
