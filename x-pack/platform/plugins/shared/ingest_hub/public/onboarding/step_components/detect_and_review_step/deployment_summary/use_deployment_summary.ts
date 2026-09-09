/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { DeploymentMethod } from '../../../aws_service_matrix';
import {
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceSettingsPersistedState,
} from '../../service_settings_step/use_service_settings';
import { getOnboardingSessionKey } from '../../../onboarding_session_storage';
import { getManagedIntegrationSummaryFields } from './managed_integration_summary';
import { getAgentBasedSummaryFields } from './agent_based_summary';
import { useAgentPolicySummary } from './use_agent_policy_summary';
import type { SummaryField } from './managed_integration_summary';

const DEFAULT_SERVICE_SETTINGS: ServiceSettingsPersistedState = {
  globalRegion: '',
  serviceVars: {},
};

interface PersistedAuthStep {
  connectorName?: string;
}

export function useDeploymentSummary(deploymentMethod: DeploymentMethod): SummaryField[] {
  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const [authStep] = useSessionStorage<PersistedAuthStep>(
    getOnboardingSessionKey('aws', 'authenticateAndDeployStep'),
    {}
  );
  const globalRegion = serviceSettings?.globalRegion || undefined;
  const connectorName = authStep?.connectorName || undefined;

  // Fetch live agent-policy summary data (only relevant for agent_based deployment).
  // The hook internally gates its queries on agentPolicyId presence, so it is safe to call
  // unconditionally — it is a no-op for the managed_integration path.
  const { agentPolicyName, enrollmentToken, agentCount } = useAgentPolicySummary();

  return useMemo(() => {
    const fields =
      deploymentMethod === 'agent_based'
        ? getAgentBasedSummaryFields({
            agentPolicyName,
            enrollmentToken,
            agentCount,
          })
        : getManagedIntegrationSummaryFields({
            globalRegion,
            cfnStackName: undefined,
            connectorName,
          });

    // Filter out fields with null value — a null value means the data source isn't available yet.
    return fields.filter((f) => f.value != null);
  }, [deploymentMethod, globalRegion, connectorName, agentPolicyName, enrollmentToken, agentCount]);
}
