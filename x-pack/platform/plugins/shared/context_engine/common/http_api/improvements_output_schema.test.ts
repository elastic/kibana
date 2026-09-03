/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPROVEMENT_ACTIONS } from './improvement_actions';
import {
  buildImprovementsJsonSchema,
  buildImprovementsOutputSchema,
  proposedImprovementSchema,
} from './improvements_output_schema';

describe('buildImprovementsOutputSchema', () => {
  it('accepts a well-formed proposal', () => {
    const result = buildImprovementsOutputSchema(['add_ki']).safeParse({
      summary: 'The index has no coverage of failed logins.',
      improvements: [
        {
          action: 'add_ki',
          title: 'Add a KI for failed logins',
          rationale: 'Agents fell back to raw logs six times.',
          confidence: 0.8,
          signal_tags: ['coverage_gap'],
          signal_ids: ['trace-1:span-1'],
          target: { subject: 'logs-auth-*' },
          payload: { ki: { type: 'document', title: 'Failed logins' } },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an action outside the allowed set', () => {
    const result = buildImprovementsOutputSchema(['add_ki']).safeParse({
      improvements: [
        {
          action: 'remove_ki',
          title: 'Drop it',
          rationale: 'Unused.',
          signal_ids: ['a'],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one signal id, so a proposal is always attached to evidence', () => {
    const result = proposedImprovementSchema.safeParse({
      action: 'add_ki',
      title: 'Add something',
      rationale: 'Because.',
      signal_ids: [],
    });

    expect(result.success).toBe(false);
  });

  it('drops the improvements array entirely when the index is observe-only', () => {
    const schema = buildImprovementsOutputSchema([]);
    const result = schema.safeParse({ summary: 'Looks healthy.', improvements: [] });

    expect(result.success).toBe(true);
    // `z.object` strips what it does not declare, so an observe-only run cannot smuggle proposals
    // through by ignoring the schema it was given.
    expect(result.success && 'improvements' in result.data).toBe(false);
  });

  it('strips fields the store owns, so a run cannot name its own lineage', () => {
    const result = proposedImprovementSchema.safeParse({
      action: 'add_ki',
      title: 'Add something',
      rationale: 'Because.',
      signal_ids: ['a'],
      improvement_id: 'attacker-chosen',
      status: 'applied',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty('improvement_id');
    expect(result.success && result.data).not.toHaveProperty('status');
  });
});

describe('buildImprovementsJsonSchema', () => {
  it('narrows the action enum to the allowed actions', () => {
    const schema = buildImprovementsJsonSchema(['add_ki', 'edit_ki']) as {
      properties: {
        improvements: { items: { properties: { action: { enum: string[] } } } };
      };
    };

    expect(schema.properties.improvements.items.properties.action.enum).toEqual([
      'add_ki',
      'edit_ki',
    ]);
  });

  it('offers the full taxonomy when nothing is narrowed', () => {
    const schema = buildImprovementsJsonSchema([...IMPROVEMENT_ACTIONS]) as {
      properties: {
        improvements: { items: { properties: { action: { enum: string[] } } } };
      };
    };

    expect(schema.properties.improvements.items.properties.action.enum).toEqual([
      ...IMPROVEMENT_ACTIONS,
    ]);
  });

  it('produces no improvements property for an observe-only index', () => {
    const schema = buildImprovementsJsonSchema([]) as { properties: Record<string, unknown> };

    expect(Object.keys(schema.properties)).toEqual(['summary']);
  });

  it('describes the KI payload from the step contract rather than a copy of it', () => {
    const schema = buildImprovementsJsonSchema(['add_ki']) as {
      properties: {
        improvements: {
          items: {
            properties: {
              payload: { properties: { ki: { required?: string[] } } };
            };
          };
        };
      };
    };

    // `type` and `title` are required by `createKi`. Deriving the JSON Schema from the same zod
    // object is what keeps the shape the agent is asked for and the shape the apply step accepts
    // from drifting apart.
    expect(schema.properties.improvements.items.properties.payload.properties.ki.required).toEqual(
      expect.arrayContaining(['type', 'title'])
    );
  });
});
