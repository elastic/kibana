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
  useBulkGetAgentPoliciesQuery: jest.fn(),
}));

import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  useGetEnrollmentAPIKeysQuery,
  useGetAgentStatusQuery,
  useBulkGetAgentPoliciesQuery,
} from '@kbn/fleet-plugin/public';
import { useAgentPolicySummary } from './use_agent_policy_summary';

const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockUseGetEnrollmentAPIKeysQuery = useGetEnrollmentAPIKeysQuery as jest.Mock;
const mockUseGetAgentStatusQuery = useGetAgentStatusQuery as jest.Mock;
const mockUseBulkGetAgentPoliciesQuery = useBulkGetAgentPoliciesQuery as jest.Mock;

const POLICY_ID = 'policy-abc-123';
const POLICY_NAME = 'AWS Agent Policy 1';

function setupMocks({
  agentPolicyId,
  agentPolicyName,
  selectedAgentPolicyIds,
  enrollmentKeyItems = [],
  agentStatusResults = {},
  bulkPoliciesItems = [],
}: {
  agentPolicyId?: string;
  agentPolicyName?: string;
  selectedAgentPolicyIds?: string[];
  enrollmentKeyItems?: Array<{ name: string }>;
  agentStatusResults?: { all?: number };
  bulkPoliciesItems?: Array<{ name: string }>;
}) {
  mockUseSessionStorage.mockReturnValue([
    { agentPolicyId, agentPolicyName, selectedAgentPolicyIds },
    jest.fn(),
  ]);
  mockUseGetEnrollmentAPIKeysQuery.mockReturnValue({ data: { items: enrollmentKeyItems } });
  mockUseGetAgentStatusQuery.mockReturnValue({ data: { results: agentStatusResults } });
  mockUseBulkGetAgentPoliciesQuery.mockReturnValue({ data: { items: bulkPoliciesItems } });
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

    it('calls useBulkGetAgentPoliciesQuery with enabled: false when no ids', () => {
      renderHook(() => useAgentPolicySummary());
      expect(mockUseBulkGetAgentPoliciesQuery).toHaveBeenCalledWith(
        [],
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

  describe('when agentPolicyId is present and name is persisted in session storage', () => {
    beforeEach(() => {
      setupMocks({
        agentPolicyId: POLICY_ID,
        agentPolicyName: POLICY_NAME,
        selectedAgentPolicyIds: [POLICY_ID],
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

    it('calls useBulkGetAgentPoliciesQuery with enabled: false (name already in session)', () => {
      renderHook(() => useAgentPolicySummary());
      expect(mockUseBulkGetAgentPoliciesQuery).toHaveBeenCalledWith(
        [POLICY_ID],
        expect.objectContaining({ enabled: false })
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

  describe('on resume — agentPolicyName absent but selectedAgentPolicyIds present', () => {
    // The actual hydrated shape from hydrateOnboardingSession writes only selectedAgentPolicyIds
    // (no agentPolicyId). The hook falls back to policyIds[0] for single-policy queries.
    // Tests deliberately omit agentPolicyId to match the real hydrated payload.

    it('fetches policy name via bulk-get and enables enrollment-key + agent-count queries using policyIds[0]', () => {
      setupMocks({
        agentPolicyId: undefined, // not set by hydrateOnboardingSession
        agentPolicyName: undefined,
        selectedAgentPolicyIds: [POLICY_ID],
        bulkPoliciesItems: [{ name: POLICY_NAME }],
        enrollmentKeyItems: [{ name: 'Default' }],
        agentStatusResults: { all: 5 },
      });

      const { result } = renderHook(() => useAgentPolicySummary());

      // Bulk-get fires to resolve the name.
      expect(mockUseBulkGetAgentPoliciesQuery).toHaveBeenCalledWith(
        [POLICY_ID],
        expect.objectContaining({ enabled: true, ignoreMissing: true })
      );
      expect(result.current.agentPolicyName).toBe(POLICY_NAME);

      // policyIds[0] fallback drives single-policy queries — they must be enabled.
      expect(mockUseGetEnrollmentAPIKeysQuery).toHaveBeenCalledWith(
        { kuery: `policy_id:"${POLICY_ID}"` },
        expect.objectContaining({ enabled: true })
      );
      expect(mockUseGetAgentStatusQuery).toHaveBeenCalledWith(
        { policyId: POLICY_ID },
        expect.objectContaining({ enabled: true })
      );
      expect(result.current.enrollmentToken).toBe('Default');
      expect(result.current.agentCount).toBe(5);
    });

    it('joins multiple policy names with ", " for multi-policy existing-mode deploys', () => {
      setupMocks({
        agentPolicyId: undefined,
        agentPolicyName: undefined,
        selectedAgentPolicyIds: ['policy-1', 'policy-2'],
        bulkPoliciesItems: [{ name: 'Policy A' }, { name: 'Policy B' }],
      });

      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.agentPolicyName).toBe('Policy A, Policy B');
      // Single-policy queries use the first id.
      expect(mockUseGetAgentStatusQuery).toHaveBeenCalledWith(
        { policyId: 'policy-1' },
        expect.objectContaining({ enabled: true })
      );
    });

    it('returns undefined agentPolicyName when bulk fetch returns empty (policy deleted)', () => {
      setupMocks({
        agentPolicyId: undefined,
        agentPolicyName: undefined,
        selectedAgentPolicyIds: [POLICY_ID],
        bulkPoliciesItems: [],
      });

      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.agentPolicyName).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('returns undefined enrollmentToken when enrollment key list is empty', () => {
      setupMocks({
        agentPolicyId: POLICY_ID,
        agentPolicyName: POLICY_NAME,
        enrollmentKeyItems: [],
      });
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.enrollmentToken).toBeUndefined();
    });

    it('returns undefined agentCount when results are empty', () => {
      setupMocks({
        agentPolicyId: POLICY_ID,
        agentPolicyName: POLICY_NAME,
        agentStatusResults: {},
      });
      const { result } = renderHook(() => useAgentPolicySummary());
      expect(result.current.agentCount).toBeUndefined();
    });

    it('returns undefined agentPolicyName when not persisted and no ids present', () => {
      setupMocks({ agentPolicyId: POLICY_ID, agentPolicyName: undefined });
      const { result } = renderHook(() => useAgentPolicySummary());
      // No selectedAgentPolicyIds → bulk fetch disabled → name is undefined
      expect(result.current.agentPolicyName).toBeUndefined();
    });
  });
});
