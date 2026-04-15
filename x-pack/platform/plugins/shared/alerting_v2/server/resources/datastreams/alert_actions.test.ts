/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineAlertActionType } from '@kbn/alerting-v2-alert-actions';
import { buildAlertActionSchema } from './alert_actions';

const baseSchema = z.object({
  '@timestamp': z.string(),
  action_type: z.string(),
  rule_id: z.string(),
});

describe('buildAlertActionSchema', () => {
  it('extends the base schema with action-specific fields as optional', () => {
    const def = defineAlertActionType({
      id: 'tag',
      description: 'Tag action.',
      bodySchema: z.object({ tags: z.array(z.string()) }),
    });

    const schema = buildAlertActionSchema(baseSchema, [def]);

    expect(
      schema.safeParse({ '@timestamp': 'now', action_type: 'tag', rule_id: 'r1' }).success
    ).toBe(true);

    expect(
      schema.safeParse({
        '@timestamp': 'now',
        action_type: 'tag',
        rule_id: 'r1',
        tags: ['a'],
      }).success
    ).toBe(true);
  });

  it('merges fields from multiple definitions', () => {
    const defA = defineAlertActionType({
      id: 'a',
      description: 'A.',
      bodySchema: z.object({ field_a: z.string() }),
    });

    const defB = defineAlertActionType({
      id: 'b',
      description: 'B.',
      bodySchema: z.object({ field_b: z.number() }),
    });

    const schema = buildAlertActionSchema(baseSchema, [defA, defB]);

    expect(
      schema.safeParse({
        '@timestamp': 'now',
        action_type: 'a',
        rule_id: 'r1',
        field_a: 'val',
        field_b: 42,
      }).success
    ).toBe(true);
  });

  it('allows two actions to share a field with the same schema type', () => {
    const defA = defineAlertActionType({
      id: 'a',
      description: 'A.',
      bodySchema: z.object({ episode_id: z.string() }),
    });

    const defB = defineAlertActionType({
      id: 'b',
      description: 'B.',
      bodySchema: z.object({ episode_id: z.string() }),
    });

    expect(() => buildAlertActionSchema(baseSchema, [defA, defB])).not.toThrow();
  });

  it('throws when an action defines a body field that shadows a base schema field', () => {
    const def = defineAlertActionType({
      id: 'bad',
      description: 'Bad.',
      bodySchema: z.object({ rule_id: z.string() }),
    });

    expect(() => buildAlertActionSchema(baseSchema, [def])).toThrow(
      "Action 'bad' defines body field 'rule_id' which is a reserved base schema field."
    );
  });

  it('throws when two actions define the same field with different schema types', () => {
    const defA = defineAlertActionType({
      id: 'a',
      description: 'A.',
      bodySchema: z.object({ shared: z.string() }),
    });

    const defB = defineAlertActionType({
      id: 'b',
      description: 'B.',
      bodySchema: z.object({ shared: z.number() }),
    });

    expect(() => buildAlertActionSchema(baseSchema, [defA, defB])).toThrow(
      "Action 'b' defines body field 'shared'"
    );
  });

  it('returns the base schema unchanged when there are no definitions', () => {
    const schema = buildAlertActionSchema(baseSchema, []);
    const result = schema.safeParse({
      '@timestamp': 'now',
      action_type: 'x',
      rule_id: 'r1',
    });

    expect(result.success).toBe(true);
  });
});
