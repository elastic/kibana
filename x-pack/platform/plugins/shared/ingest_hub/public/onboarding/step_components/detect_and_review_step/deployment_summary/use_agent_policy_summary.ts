/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fetches live agent-policy summary data for step 4's Deployment summary section.
 *
 * Three live sources:
 *   - agentPolicyName — from session storage (persisted by use_agent_based_deploy on deploy)
 *   - enrollmentToken — from Fleet's enrollment-keys API keyed on agentPolicyId
 *   - agentCount      — from Fleet's agent-status API polled every 10 s
 *
 * Enrollment token is NOT persisted — it's a credential. The existing "secret lives in memory"
 * rule applies here the same way it applies to secret_access_key. Fetch live every time.
 */

import { useMemo } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useGetEnrollmentAPIKeysQuery, useGetAgentStatus } from '@kbn/fleet-plugin/public';
import { getOnboardingSessionKey } from '../../../onboarding_session_storage';

interface PersistedAuthStep {
  agentPolicyId?: string;
  agentPolicyName?: string;
}

export interface AgentPolicySummaryData {
  agentPolicyName?: string;
  /** Human-readable token name (e.g. "Default") — not the raw API key value */
  enrollmentToken?: string;
  agentCount?: number;
}

export function useAgentPolicySummary(): AgentPolicySummaryData {
  const [authStep] = useSessionStorage<PersistedAuthStep>(
    getOnboardingSessionKey('aws', 'authenticateAndDeployStep'),
    {}
  );

  const agentPolicyId = authStep?.agentPolicyId;
  const agentPolicyName = authStep?.agentPolicyName;

  // Fetch enrollment keys for the agent policy — only when an agentPolicyId is set.
  // Not `usePollingAgentCount` — it hardcodes `enrolled_at >= now-10m`, clears its own timer
  // once any agent appears, returns ids not a count, and isn't barrel-exported.
  const { data: enrollmentKeysData } = useGetEnrollmentAPIKeysQuery(
    { kuery: agentPolicyId ? `policy_id:"${agentPolicyId}"` : '' },
    { refetchInterval: false }
  );

  const enrollmentToken = useMemo(() => {
    if (!agentPolicyId) return undefined;
    const key = enrollmentKeysData?.items?.[0];
    return key?.name as string | undefined;
  }, [agentPolicyId, enrollmentKeysData]);

  // Agent count — polled on the same 10s cadence used by use_service_data_detection.ts.
  // Pass policyId when set; the hook always fires so we ignore the result when policyId is absent.
  const { data: agentStatusData } = useGetAgentStatus(
    { policyId: agentPolicyId ?? '' },
    { pollIntervalMs: agentPolicyId ? 10_000 : undefined }
  );

  // `results.all` is the total enrolled count across all statuses.
  // Only meaningful once an agentPolicyId is set.
  const agentCount = agentPolicyId ? agentStatusData?.results?.all : undefined;

  return { agentPolicyName, enrollmentToken, agentCount };
}
