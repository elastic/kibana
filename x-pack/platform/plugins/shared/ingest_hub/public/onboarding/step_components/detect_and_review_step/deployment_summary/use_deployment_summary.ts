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
import {
  ECF_LAUNCH_STEP_SESSION_KEY,
  type PersistedEcfLaunchStep,
} from '../../ecf_deployment_section';
import {
  ECF_UNIFIED_STACK_NAME,
  ECF_OTEL_STACK_NAME,
  ECF_CROWDSTRIKE_STACK_NAME,
} from '../../../ecf_cloudformation';

const DEFAULT_SERVICE_SETTINGS: ServiceSettingsPersistedState = {
  globalRegion: '',
  serviceVars: {},
};

interface PersistedAuthStep {
  connectorName?: string;
}

const DEFAULT_ECF_LAUNCH_STEP: PersistedEcfLaunchStep = { launchedFamilies: [] };

export function useDeploymentSummary(deploymentMethod: DeploymentMethod): SummaryField[] {
  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const [authStep] = useSessionStorage<PersistedAuthStep>(
    getOnboardingSessionKey('aws', 'authenticateAndDeployStep'),
    {}
  );
  const [ecfLaunchStep] = useSessionStorage<PersistedEcfLaunchStep>(
    getOnboardingSessionKey('aws', ECF_LAUNCH_STEP_SESSION_KEY),
    DEFAULT_ECF_LAUNCH_STEP
  );
  const globalRegion = serviceSettings?.globalRegion || undefined;
  const connectorName = authStep?.connectorName || undefined;

  // Fetch live agent-policy summary data (only relevant for agent_based deployment).
  // The hook internally gates its queries on agentPolicyId presence, so it is safe to call
  // unconditionally — it is a no-op for the managed_integration path.
  const { agentPolicyName, enrollmentToken, agentCount } = useAgentPolicySummary();

  return useMemo(() => {
    if (deploymentMethod === 'agent_based') {
      return getAgentBasedSummaryFields({ agentPolicyName, enrollmentToken, agentCount }).filter(
        (f) => f.value != null
      );
    }

    // Resolve the CloudFormation stack name from session storage. When multiple families
    // were launched (currently impossible in practice — only one family is active today),
    // join them. Precedence: persisted stackNames override → family default.
    const { launchedFamilies = [], stackNames = {}, stackVersions = {} } = ecfLaunchStep ?? {};

    const cfnStackName =
      launchedFamilies
        .map((family) => {
          // || (not ??) so an empty string (user cleared the field) falls back to the default.
          if (family === 'unified') return stackNames.unified || ECF_UNIFIED_STACK_NAME;
          if (family === 'otel') return stackNames.otel || ECF_OTEL_STACK_NAME;
          if (family === 'crowdstrike') return stackNames.crowdstrike || ECF_CROWDSTRIKE_STACK_NAME;
          return null;
        })
        .filter(Boolean)
        .join(', ') || undefined;

    const cfnTemplateVersion =
      launchedFamilies
        .map((family) => stackVersions[family])
        .filter(Boolean)
        .join(', ') || undefined;

    const fields = getManagedIntegrationSummaryFields({
      globalRegion,
      cfnStackName,
      cfnTemplateVersion,
      connectorName,
    });

    // Filter out fields with null value — a null value means the data source isn't available yet.
    return fields.filter((f) => f.value != null);
  }, [
    deploymentMethod,
    globalRegion,
    ecfLaunchStep,
    connectorName,
    agentPolicyName,
    enrollmentToken,
    agentCount,
  ]);
}
