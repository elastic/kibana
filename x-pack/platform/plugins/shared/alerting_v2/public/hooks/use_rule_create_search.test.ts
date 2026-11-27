/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getCreateRuleWithAgentPrompt } from '../constants';
import { useRuleCreateSearch } from './use_rule_create_search';

let mockUnifiedRuleCreationEnabled = true;
let mockAgentBuilderAvailable = true;
const mockOpenAgentBuilderChat = jest.fn();

jest.mock('./use_unified_rule_creation_enabled', () => ({
  useUnifiedRuleCreationEnabled: () => mockUnifiedRuleCreationEnabled,
}));
jest.mock('./use_are_agent_builder_skills_available', () => ({
  useAreAgentBuilderSkillsAvailable: () => mockAgentBuilderAvailable,
}));
jest.mock('./use_open_agent_builder_chat', () => ({
  useOpenAgentBuilderChat: () => mockOpenAgentBuilderChat,
}));

describe('useRuleCreateSearch', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnifiedRuleCreationEnabled = true;
    mockAgentBuilderAvailable = true;
  });

  it('returns undefined while the unified rule creation flag is off', () => {
    mockUnifiedRuleCreationEnabled = false;

    const { result } = renderHook(() => useRuleCreateSearch({ onClose }));

    expect(result.current).toBeUndefined();
  });

  it('returns a search without sections until the section issues wire them', () => {
    const { result } = renderHook(() => useRuleCreateSearch({ onClose }));

    expect(result.current?.sections).toEqual({});
  });

  it('keeps onQueryChange stable across renders so the search does not re-report the query', () => {
    const { result, rerender } = renderHook(() => useRuleCreateSearch({ onClose }));
    const firstOnQueryChange = result.current?.onQueryChange;

    rerender();

    expect(result.current?.onQueryChange).toBe(firstOnQueryChange);
  });

  it('closes the flyout and opens the side chat with the request in the prompt on send', () => {
    const { result } = renderHook(() => useRuleCreateSearch({ onClose }));

    result.current?.onSendToAgent?.('alert on cpu');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockOpenAgentBuilderChat).toHaveBeenCalledWith(
      getCreateRuleWithAgentPrompt('alert on cpu')
    );
  });

  it('cannot send to the agent without Agent Builder access', () => {
    mockAgentBuilderAvailable = false;

    const { result } = renderHook(() => useRuleCreateSearch({ onClose }));

    expect(result.current).toBeDefined();
    expect(result.current?.onSendToAgent).toBeUndefined();
  });
});
