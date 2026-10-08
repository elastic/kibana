/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStepType,
  ZERO_MODEL_USAGE,
  createInjectedContextStep,
  createSubstitutionStep,
  getConversationRoundAuthorDisplayName,
  isInjectedContextStep,
  isZeroModelUsage,
} from './conversation';

describe('isZeroModelUsage', () => {
  it('is true for the sentinel and false for any real usage', () => {
    expect(isZeroModelUsage(ZERO_MODEL_USAGE)).toBe(true);
    expect(isZeroModelUsage({ ...ZERO_MODEL_USAGE })).toBe(true);
    expect(isZeroModelUsage({ ...ZERO_MODEL_USAGE, llm_calls: 1 })).toBe(false);
    expect(isZeroModelUsage({ ...ZERO_MODEL_USAGE, connector_id: 'c' })).toBe(false);
    expect(isZeroModelUsage({ ...ZERO_MODEL_USAGE, model: 'm' })).toBe(false);
  });
});

describe('getConversationRoundAuthorDisplayName', () => {
  it('returns undefined when author is missing', () => {
    expect(getConversationRoundAuthorDisplayName()).toBeUndefined();
  });

  it('prefers full name over username', () => {
    expect(
      getConversationRoundAuthorDisplayName({
        id: 'user-1',
        full_name: 'Alice Example',
        username: 'alice',
      })
    ).toBe('Alice Example');
  });

  it('falls back to username', () => {
    expect(
      getConversationRoundAuthorDisplayName({
        id: 'user-1',
        username: 'alice',
      })
    ).toBe('alice');
  });
});

describe('injected context steps', () => {
  it('creates a step of the injected_context type', () => {
    const step = createInjectedContextStep({
      hook_id: 'memory',
      text: 'remember this',
      pin: 'round',
    });

    expect(step).toEqual({
      type: ConversationRoundStepType.injectedContext,
      hook_id: 'memory',
      text: 'remember this',
      pin: 'round',
    });
  });

  it('narrows on the step type', () => {
    const injected = createInjectedContextStep({ hook_id: 'memory', text: 'x' });
    const other = createSubstitutionStep({
      substituted_tool_calls: [],
      trigger: 'round_start',
      threshold_tokens: 1,
    });

    expect(isInjectedContextStep(injected)).toBe(true);
    expect(isInjectedContextStep(other)).toBe(false);
  });
});
