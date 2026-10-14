/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assigneesChangedEventSchema } from './conversation_events';

describe('assigneesChangedEventSchema', () => {
  it('accepts added and removed users', () => {
    expect(
      assigneesChangedEventSchema.safeParse({
        added: ['u1'],
        removed: ['u2'],
      }).success
    ).toBe(true);
  });

  it('accepts a change with only additions', () => {
    expect(assigneesChangedEventSchema.safeParse({ added: ['u1'], removed: [] }).success).toBe(
      true
    );
  });

  it('accepts the automation behind the change', () => {
    expect(
      assigneesChangedEventSchema.safeParse({
        added: ['u1'],
        removed: [],
        via: { type: 'agent', agent_id: 'a1' },
      }).success
    ).toBe(true);
  });

  it('rejects an event with no changes', () => {
    expect(assigneesChangedEventSchema.safeParse({ added: [], removed: [] }).success).toBe(false);
  });

  it('rejects an empty uid', () => {
    expect(assigneesChangedEventSchema.safeParse({ added: [''], removed: [] }).success).toBe(false);
  });
});
