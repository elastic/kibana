/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { statusChangedEventSchema } from './conversation_events';

describe('statusChangedEventSchema', () => {
  it('accepts a change by a user', () => {
    expect(statusChangedEventSchema.safeParse({ from: 'open', to: 'closed' }).success).toBe(true);
  });

  it('accepts a change by a workflow or an agent', () => {
    expect(
      statusChangedEventSchema.safeParse({
        to: 'open',
        via: { type: 'workflow', workflow_id: 'w1', workflow_name: 'Triage', execution_id: 'e1' },
      }).success
    ).toBe(true);
    expect(
      statusChangedEventSchema.safeParse({
        to: 'closed',
        via: { type: 'agent', agent_id: 'a1', agent_name: 'Triage agent' },
      }).success
    ).toBe(true);
  });

  it('rejects an unknown status or an unknown automation type', () => {
    expect(statusChangedEventSchema.safeParse({ to: 'resolved' }).success).toBe(false);
    expect(
      statusChangedEventSchema.safeParse({ to: 'open', via: { type: 'cron', id: 'x' } }).success
    ).toBe(false);
  });
});
