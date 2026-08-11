/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { ActiveSpaceProvider } from '../context/active_space_context';
import { storageKeys } from '../storage_keys';
import { getLastAgentId, useLastAgentId } from './use_last_agent_id';

const wrapperFor = (spaceId: string) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ActiveSpaceProvider spaceId={spaceId}>{children}</ActiveSpaceProvider>
  );
  return Wrapper;
};

describe('use_last_agent_id', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads the cached agent ID for the active space', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('agent-a'));

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('default') });

    expect(result.current).toBe('agent-a');
  });

  it('does not leak agents between spaces', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('agent-a'));

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('marketing') });

    // No agent cached for the marketing space → falls back to the default agent.
    expect(result.current).toBe(agentBuilderDefaultAgentId);
  });

  it('getLastAgentId reads from the active space key once the provider has mounted', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('engineering'), JSON.stringify('agent-z'));

    // Render the provider so the module-scoped resolved space ID is set.
    renderHook(() => null, { wrapper: wrapperFor('engineering') });

    expect(getLastAgentId()).toBe('agent-z');
  });
});
