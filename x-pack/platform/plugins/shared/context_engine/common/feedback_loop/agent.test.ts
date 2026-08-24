/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_FEEDBACK_AGENT_ID } from '../constants';
import { isDefaultFeedbackAgent, resolveFeedbackAgentId } from './agent';

describe('resolveFeedbackAgentId', () => {
  it("uses the AI index's own agent when it has one", () => {
    expect(resolveFeedbackAgentId('my.support.agent')).toBe('my.support.agent');
  });

  it('falls back to the built-in agent when none is chosen', () => {
    expect(resolveFeedbackAgentId(undefined)).toBe(CONTEXT_ENGINE_FEEDBACK_AGENT_ID);
  });

  it('treats an empty or whitespace-only id as unchosen', () => {
    expect(resolveFeedbackAgentId('')).toBe(CONTEXT_ENGINE_FEEDBACK_AGENT_ID);
    expect(resolveFeedbackAgentId('   ')).toBe(CONTEXT_ENGINE_FEEDBACK_AGENT_ID);
  });

  it('trims a padded id so it matches the registered agent', () => {
    expect(resolveFeedbackAgentId('  my.support.agent  ')).toBe('my.support.agent');
  });
});

describe('isDefaultFeedbackAgent', () => {
  it('is true when the index relies on the built-in default', () => {
    expect(isDefaultFeedbackAgent(undefined)).toBe(true);
    expect(isDefaultFeedbackAgent(CONTEXT_ENGINE_FEEDBACK_AGENT_ID)).toBe(true);
  });

  it('is false when the index names its own agent', () => {
    expect(isDefaultFeedbackAgent('my.support.agent')).toBe(false);
  });
});
