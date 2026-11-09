/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toggleLeadFeedback } from './lead_feedback';

describe('lead feedback', () => {
  it('toggles a vote on the first click and retracts it on a second click', () => {
    expect(toggleLeadFeedback(undefined, 'useful')).toBe('useful');
    expect(toggleLeadFeedback('useful', 'useful')).toBeUndefined();
    expect(toggleLeadFeedback('useful', 'not_useful')).toBe('not_useful');
  });
});
