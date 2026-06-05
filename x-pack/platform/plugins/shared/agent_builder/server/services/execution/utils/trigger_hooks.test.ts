/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldInvokeAgentForMessage } from './trigger_hooks';

describe('shouldInvokeAgentForMessage', () => {
  it('returns false for human-only notes', () => {
    expect(shouldInvokeAgentForMessage('triage note for the team')).toBe(false);
  });

  it('returns true when message contains @agent', () => {
    expect(shouldInvokeAgentForMessage('@agent summarize')).toBe(true);
    expect(shouldInvokeAgentForMessage('please @agent help')).toBe(true);
  });
});
