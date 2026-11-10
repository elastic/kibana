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
  procedures: [{ type: 'rebooking', description: 'How a missed connection is rebooked.' }],
};

describe('dreamingConfigSchema', () => {
  it('accepts a full config as it is', () => {
    expect(dreamingConfigSchema.validate(config)).toEqual(config);
  });

  it('accepts dreaming switched off with nothing else', () => {
    expect(dreamingConfigSchema.validate({ enabled: false })).toEqual({ enabled: false });
  });

  it('accepts null facts, entities and procedures', () => {
    expect(
      dreamingConfigSchema.validate({
        enabled: false,
        facts: null,
        entities: null,
        procedures: null,
      })
    ).toEqual({ enabled: false, facts: null, entities: null, procedures: null });
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

  it('rejects a procedure type listed twice', () => {
    expect(() =>
      dreamingConfigSchema.validate({
        ...config,
        procedures: [...config.procedures, { type: 'rebooking' }],
      })
    ).toThrow("Procedure type 'rebooking' is listed twice.");
  });

  it('rejects relationship types, which dreaming no longer builds', () => {
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
});
