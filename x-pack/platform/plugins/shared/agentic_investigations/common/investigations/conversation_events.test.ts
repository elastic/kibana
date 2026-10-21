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

  it('rejects an unknown status', () => {
    expect(statusChangedEventSchema.safeParse({ to: 'resolved' }).success).toBe(false);
  });
});
