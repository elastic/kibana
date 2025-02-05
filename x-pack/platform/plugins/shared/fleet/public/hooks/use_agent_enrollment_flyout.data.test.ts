/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFleetTestRendererMock } from '../mock';

import { useGetAgentPolicies, useAgentEnrollmentFlyoutData } from '.';

jest.mock('./use_request', () => {
  return {
    ...jest.requireActual('./use_request'),
    useGetAgentPolicies: jest.fn(),
  };
});

describe('useAgentEnrollmentFlyoutData', () => {
  const testRenderer = createFleetTestRendererMock();

  it('should return empty agentPolicies when http loading', () => {
    (useGetAgentPolicies as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    const { result } = testRenderer.renderHook(() => useAgentEnrollmentFlyoutData());
    expect(result.current.agentPolicies).toEqual([]);
    expect(result.current.isLoadingAgentPolicies).toBe(true);
  });

  it('should return empty agentPolicies when http not loading and no data', () => {
    (useGetAgentPolicies as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = testRenderer.renderHook(() => useAgentEnrollmentFlyoutData());
    expect(result.current.agentPolicies).toEqual([]);
  });

  it('should return empty agentPolicies when http not loading and no items', () => {
    (useGetAgentPolicies as jest.Mock).mockReturnValue({ data: { items: undefined } });
    const { result } = testRenderer.renderHook(() => useAgentEnrollmentFlyoutData());
    expect(result.current.agentPolicies).toEqual([]);
  });

  it('should return agentPolicies when http not loading', () => {
    (useGetAgentPolicies as jest.Mock).mockReturnValue({ data: { items: [{ id: 'policy1' }] } });
    const { result } = testRenderer.renderHook(() => useAgentEnrollmentFlyoutData());
    expect(result.current.agentPolicies).toEqual([{ id: 'policy1' }]);
  });

  it('should resend request when refresh agent policies called', () => {
    const resendRequestMock = jest.fn();
    (useGetAgentPolicies as jest.Mock).mockReturnValue({
      data: { items: [{ id: 'policy1' }] },
      isLoading: false,
      resendRequest: resendRequestMock,
    });
    const { result } = testRenderer.renderHook(() => useAgentEnrollmentFlyoutData());
    result.current.refreshAgentPolicies();
    expect(resendRequestMock).toHaveBeenCalled();
  });
});
