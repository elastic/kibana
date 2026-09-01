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
import { getManagedIntegrationSummaryFields } from './managed_integration_summary';
import { getAgentBasedSummaryFields } from './agent_based_summary';
import type { SummaryField } from './managed_integration_summary';

const DEFAULT_SERVICE_SETTINGS: ServiceSettingsPersistedState = {
  globalRegion: '',
  serviceVars: {},
};

export function useDeploymentSummary(deploymentMethod: DeploymentMethod): SummaryField[] {
  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const globalRegion = serviceSettings?.globalRegion || undefined;

  return useMemo(() => {
    const fields =
      deploymentMethod === 'agent_based'
        ? getAgentBasedSummaryFields()
        : getManagedIntegrationSummaryFields({ globalRegion, cfnStackName: undefined });

    // Filter out fields with null value — a null value means the data source isn't available yet.
    return fields.filter((f) => f.value != null);
  }, [deploymentMethod, globalRegion]);
}
