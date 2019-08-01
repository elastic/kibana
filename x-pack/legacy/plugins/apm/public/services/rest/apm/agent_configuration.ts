/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callApmApi } from '../callApi';
import { AgentConfigurationIntake } from '../../../../server/lib/settings/agent_configuration/configuration_types';
import { agentConfigurationListRoute } from '../../../../server/routes/agent_configuration/agent_configuration_list_route';
import { environmentsRoute } from '../../../../server/routes/agent_configuration/environments_route';
import { serviceNamesRoute } from '../../../../server/routes/agent_configuration/service_names_route';
import { createAgentConfigurationRoute } from '../../../../server/routes/agent_configuration/create_agent_configuration_route';
import { updateAgentConfigurationRoute } from '../../../../server/routes/agent_configuration/update_agent_configuration_route';

export async function loadAgentConfigurationServices() {
  return callApmApi<typeof serviceNamesRoute>({
    pathname: `/api/apm/settings/agent-configuration/services`
  });
}

export async function loadAgentConfigurationEnvironments({
  serviceName
}: {
  serviceName: string;
}) {
  return callApmApi<typeof environmentsRoute>({
    pathname: `/api/apm/settings/agent-configuration/services/${serviceName}/environments`
  });
}

export async function createAgentConfiguration(
  configuration: AgentConfigurationIntake
) {
  return callApmApi<typeof createAgentConfigurationRoute>({
    pathname: `/api/apm/settings/agent-configuration/new`,
    method: 'POST',
    body: JSON.stringify(configuration)
  });
}

export async function updateAgentConfiguration(
  configurationId: string,
  configuration: AgentConfigurationIntake
) {
  return callApmApi<typeof updateAgentConfigurationRoute>({
    pathname: `/api/apm/settings/agent-configuration/${configurationId}`,
    method: 'PUT',
    body: JSON.stringify(configuration)
  });
}

export async function deleteAgentConfiguration(configId: string) {
  return callApmApi({
    pathname: `/api/apm/settings/agent-configuration/${configId}`,
    method: 'DELETE'
  });
}

export async function loadAgentConfigurationList() {
  return callApmApi<typeof agentConfigurationListRoute>({
    pathname: `/api/apm/settings/agent-configuration`
  });
}
