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

const mockUseEffectiveSpaceDefaultAgent = jest.fn();
jest.mock('./use_space_default_agent', () => ({
  useEffectiveSpaceDefaultAgent: () => mockUseEffectiveSpaceDefaultAgent(),
}));

const mockValidateAgentId = jest.fn();
jest.mock('./agents/use_validate_agent_id', () => ({
  useValidateAgentId: () => mockValidateAgentId,
}));

const wrapperFor = (spaceId: string) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ActiveSpaceProvider spaceId={spaceId}>{children}</ActiveSpaceProvider>
  );
  return Wrapper;
};

describe('use_last_agent_id', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default to "ready, no effective assignment" so the existing tests behave
    // as before unless a case explicitly overrides.
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isReady: true,
      isRestricted: false,
    });
    mockValidateAgentId.mockReturnValue(true);
  });

  it('reads the cached agent ID for the active space', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('agent-a'));

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('default') });

    expect(result.current.agentId).toBe('agent-a');
  });

  it('does not leak agents between spaces', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('agent-a'));
    // No stored value for the 'marketing' space → validation is asked about
    // `undefined`, which the real hook also rejects.
    mockValidateAgentId.mockImplementation((id?: string) => id === 'agent-a');

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('marketing') });

    expect(result.current.agentId).toBe(agentBuilderDefaultAgentId);
  });

  it('getLastAgentId reads from the active space key once the provider has mounted', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('engineering'), JSON.stringify('agent-z'));

    renderHook(() => null, { wrapper: wrapperFor('engineering') });

    expect(getLastAgentId()).toBe('agent-z');
  });

  it('prefers the effective space default agent over localStorage when ready', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('agent-a'));
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isReady: true,
      isRestricted: true,
    });

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('default') });

    expect(result.current.agentId).toBe('siemens-agent');
  });

  it('keeps a validated localStorage agent for unrestricted users even when a space default is assigned', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('agent-a'));
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isReady: true,
      isRestricted: false,
    });
    mockValidateAgentId.mockReturnValue(true);

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('default') });

    expect(result.current.agentId).toBe('agent-a');
  });

  // When an unrestricted user's localStorage id is invalid we still prefer the
  // space default over the platform default so a fresh/wiped browser lands on
  // the assignment rather than the built-in agent.
  it('falls back to the effective space default when localStorage is invalid for unrestricted users', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('deleted-agent'));
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isReady: true,
      isRestricted: false,
    });
    mockValidateAgentId.mockReturnValue(false);

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('default') });

    expect(result.current.agentId).toBe('siemens-agent');
  });

  it('degrades to the platform default when the stored id no longer resolves in the agents list', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('deleted-agent'));
    mockValidateAgentId.mockReturnValue(false);

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('default') });

    expect(result.current.agentId).toBe(agentBuilderDefaultAgentId);
  });

  it('returns the last-used localStorage agent, and isReady:false, while not ready', () => {
    localStorage.setItem(storageKeys.getAgentIdKey('default'), JSON.stringify('agent-a'));
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isReady: false,
      isRestricted: false,
    });
    mockValidateAgentId.mockReturnValue(false);

    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('default') });

    expect(result.current.agentId).toBe('agent-a');
    expect(result.current.isReady).toBe(false);
  });

  it('exposes isReady from the effective space default', () => {
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isReady: true,
      isRestricted: false,
    });
    const { result } = renderHook(() => useLastAgentId(), { wrapper: wrapperFor('default') });
    expect(result.current.isReady).toBe(true);
  });
});
