/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

jest.mock('@kbn/fleet-plugin/public', () => ({
  useGetEnrollmentAPIKeysQuery: jest.fn(),
  useGetAgentStatusQuery: jest.fn(),
}));

import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useGetEnrollmentAPIKeysQuery, useGetAgentStatusQuery } from '@kbn/fleet-plugin/public';
import { useAgentPolicySummary } from './use_agent_policy_summary';

const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockUseGetEnrollmentAPIKeysQuery = useGetEnrollmentAPIKeysQuery as jest.Mock;
const mockUseGetAgentStatusQuery = useGetAgentStatusQuery as jest.Mock;

const POLICY_ID = 'policy-abc-123';
const POLICY_NAME = 'AWS Agent Policy 1';

function setupMocks({
  agentPolicyId,
  agentPolicyName,
  enrollmentKeyItems = [],
  agentStatusResults = {},
}: {
  agentPolicyId?: string;
  agentPolicyName?: string;
  enrollmentKeyItems?: Array<{ name: string }>;
  agentStatusResults?: { all?: number };
}) {
  mockUseSessionStorage.mockReturnValue([{ agentPolicyId, agentPolicyName }, jest.fn()]);
  mockUseGetEnrollmentAPIKeysQuery.mockReturnValue({ data: { items: enrollmentKeyItems } });
  mockUseGetAgentStatusQuery.mockReturnValue({ data: { results: agentStatusResults } });
}

describe('useAgentPolicySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when agentPolicyId is absent', () => {
    beforeEach(() => {
      setupMocks({ agentPolicyId: undefined });
    });

    it('calls useGetEnrollmentAPIKeysQuery with enabled: false', () => {
      renderHook(() => useAgentPolicySummary());
      expect(mockUseGetEnrollmentAPIKeysQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ enabled: false })
      );
    });

    it('calls useGetAgentStatusQuery with enabled: false', () => {
      renderHook(() => useAgentPolicySummary());
      expect(mockUseGetAgentStatusQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ enabled: false })
      );
    });

    it('returns undefined for all fields', () => {
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.agentPolicyName).toBeUndefined();
      expect(result.current.enrollmentToken).toBeUndefined();
      expect(result.current.agentCount).toBeUndefined();
    });
  });

  describe('when agentPolicyId is present', () => {
    beforeEach(() => {
      setupMocks({
        agentPolicyId: POLICY_ID,
        agentPolicyName: POLICY_NAME,
        enrollmentKeyItems: [{ name: 'Default' }],
        agentStatusResults: { all: 3 },
      });
    });

    it('calls useGetEnrollmentAPIKeysQuery with enabled: true and kuery for the policy', () => {
      renderHook(() => useAgentPolicySummary());
      expect(mockUseGetEnrollmentAPIKeysQuery).toHaveBeenCalledWith(
        { kuery: `policy_id:"${POLICY_ID}"` },
        expect.objectContaining({ enabled: true })
      );
    });

    it('calls useGetAgentStatusQuery with enabled: true and policyId', () => {
      renderHook(() => useAgentPolicySummary());
      expect(mockUseGetAgentStatusQuery).toHaveBeenCalledWith(
        { policyId: POLICY_ID },
        expect.objectContaining({ enabled: true })
      );
    });

    it('returns the persisted agentPolicyName', () => {
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.agentPolicyName).toBe(POLICY_NAME);
    });

    it('returns the enrollment token name from the first key', () => {
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.enrollmentToken).toBe('Default');
    });

    it('returns the total agent count', () => {
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.agentCount).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('returns undefined enrollmentToken when enrollment key list is empty', () => {
      setupMocks({ agentPolicyId: POLICY_ID, enrollmentKeyItems: [] });
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.enrollmentToken).toBeUndefined();
    });

    it('returns undefined agentCount when results are empty', () => {
      setupMocks({ agentPolicyId: POLICY_ID, agentStatusResults: {} });
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.agentCount).toBeUndefined();
    });

    it('returns undefined agentPolicyName when not persisted', () => {
      setupMocks({ agentPolicyId: POLICY_ID, agentPolicyName: undefined });
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.agentPolicyName).toBeUndefined();
    });
  });
});
