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
 *   - agentPolicyName — from session storage (persisted by use_agent_based_deploy on deploy).
 *     On resume the session value is gone, so this hook falls back to a bulk-get of the
 *     policy ids recorded in selectedAgentPolicyIds. useBulkGetAgentPoliciesQuery is only
 *     fired when agentPolicyName is absent and ids are present (i.e. resume path only).
 *   - enrollmentToken — from Fleet's enrollment-keys API keyed on agentPolicyId
 *   - agentCount      — from Fleet's agent-status API polled every 10 s
 *
 * Enrollment token and agent count are NOT persisted — they're credentials / live state.
 * Fetch live every time. Both reflect only the first policy id in multi-policy mode (pre-existing
 * single-policy limitation; out of scope for this change).
 */

import { useMemo } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  useGetEnrollmentAPIKeysQuery,
  useGetAgentStatusQuery,
  useBulkGetAgentPoliciesQuery,
} from '@kbn/fleet-plugin/public';
import { getOnboardingSessionKey } from '../../../onboarding_session_storage';

interface PersistedAuthStep {
  agentPolicyId?: string;
  agentPolicyName?: string;
  selectedAgentPolicyIds?: string[];
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
  const policyIds = authStep?.selectedAgentPolicyIds ?? [];

  // Fetch policy names when the denormalised name is missing (resume path) but ids are present.
  // On a fresh deploy, agentPolicyName is always populated from the deploy result, so this
  // query fires with enabled: false and costs nothing.
  const needsNameFetch = !authStep?.agentPolicyName && policyIds.length > 0;
  const { data: policiesData } = useBulkGetAgentPoliciesQuery(policyIds, {
    ignoreMissing: true,
    enabled: needsNameFetch,
  });

  const agentPolicyName = useMemo(() => {
    if (authStep?.agentPolicyName) return authStep.agentPolicyName;
    if (!policiesData?.items?.length) return undefined;
    return policiesData.items.map((p) => p.name).join(', ');
  }, [authStep?.agentPolicyName, policiesData]);

  // Fetch enrollment keys for the agent policy — only when an agentPolicyId is set.
  // Not `usePollingAgentCount` — it hardcodes `enrolled_at >= now-10m`, clears its own timer
  // once any agent appears, returns ids not a count, and isn't barrel-exported.
  const { data: enrollmentKeysData } = useGetEnrollmentAPIKeysQuery(
    { kuery: agentPolicyId ? `policy_id:"${agentPolicyId}"` : '' },
    { enabled: !!agentPolicyId }
  );

  const enrollmentToken = useMemo(() => {
    if (!agentPolicyId) return undefined;
    const key = enrollmentKeysData?.items?.[0];
    return key?.name as string | undefined;
  }, [agentPolicyId, enrollmentKeysData]);

  // Agent count — polled on the same 10s cadence used by use_service_data_detection.ts.
  const { data: agentStatusData } = useGetAgentStatusQuery(
    { policyId: agentPolicyId ?? '' },
    { enabled: !!agentPolicyId, refetchInterval: agentPolicyId ? 10_000 : false }
  );

  // `results.all` is the total enrolled count across all statuses.
  // Only meaningful once an agentPolicyId is set.
  const agentCount = agentPolicyId ? agentStatusData?.results?.all : undefined;

  return { agentPolicyName, enrollmentToken, agentCount };
}
