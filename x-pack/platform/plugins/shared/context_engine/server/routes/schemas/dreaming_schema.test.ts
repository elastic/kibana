/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dreamingConfigSchema,
  getDreamingResponseSchema,
  runDreamingResponseSchema,
} from './dreaming_schema';

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
});

describe('getDreamingResponseSchema', () => {
  const schema = getDreamingResponseSchema();

  it('accepts dreaming without last_run', () => {
    expect(schema.validate({ dreaming: { enabled: false } })).toEqual({
      dreaming: { enabled: false },
    });
  });

  it('accepts dreaming with last_run', () => {
    const body = {
      dreaming: { enabled: true, facts: [{ type: 'note' }] },
      last_run: {
        started_at: '2026-11-01T12:00:00.000Z',
        status: 'running',
        workflow_id: 'system-context-engine-dreaming-support',
        execution_id: 'exec-1',
        is_running: true,
      },
    };
    expect(schema.validate(body)).toEqual(body);
  });
});

describe('runDreamingResponseSchema', () => {
  const schema = runDreamingResponseSchema();

  it('accepts started executions and failures', () => {
    const body = {
      executions: [{ workflow_id: 'wf-1', execution_id: 'exec-1' }],
      failed: ['wf-2'],
    };
    expect(schema.validate(body)).toEqual(body);
  });

  it('bounds the executions list', () => {
    expect(() =>
      schema.validate({
        executions: [
          { workflow_id: 'a', execution_id: '1' },
          { workflow_id: 'b', execution_id: '2' },
          { workflow_id: 'c', execution_id: '3' },
          { workflow_id: 'd', execution_id: '4' },
        ],
        failed: [],
      })
    ).toThrow();
  });
});
