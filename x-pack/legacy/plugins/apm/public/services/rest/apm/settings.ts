/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UpdateAgentConfigurationAPIResponse } from '../../../../server/lib/settings/agent_configuration/update_configuration';
import { callApi } from '../callApi';
import { AgentConfigurationIntake } from '../../../../server/lib/settings/agent_configuration/configuration_types';
import { AgentConfigurationServicesAPIResponse } from '../../../../server/lib/settings/agent_configuration/get_service_names';
import { CreateAgentConfigurationAPIResponse } from '../../../../server/lib/settings/agent_configuration/create_configuration';
import { AgentConfigurationListAPIResponse } from '../../../../server/lib/settings/agent_configuration/list_configurations';
import { AgentConfigurationEnvironmentsAPIResponse } from '../../../../server/lib/settings/agent_configuration/get_environments';

export async function loadAgentConfigurationServices() {
  return callApi<AgentConfigurationServicesAPIResponse>({
    pathname: `/api/apm/settings/agent-configuration/services`
  });
}

export async function loadAgentConfigurationEnvironments({
  serviceName
}: {
  serviceName: string;
}) {
  return callApi<AgentConfigurationEnvironmentsAPIResponse>({
    pathname: `/api/apm/settings/agent-configuration/services/${serviceName}/environments`
  });
}

export async function createAgentConfiguration(
  configuration: AgentConfigurationIntake
) {
  return callApi<CreateAgentConfigurationAPIResponse>({
    pathname: `/api/apm/settings/agent-configuration/new`,
    method: 'POST',
    body: JSON.stringify(configuration)
  });
}

export async function updateAgentConfiguration(
  configurationId: string,
  configuration: AgentConfigurationIntake
) {
  return callApi<UpdateAgentConfigurationAPIResponse>({
    pathname: `/api/apm/settings/agent-configuration/${configurationId}`,
    method: 'PUT',
    body: JSON.stringify(configuration)
  });
}

export async function deleteAgentConfiguration(configId: string) {
  return callApi({
    pathname: `/api/apm/settings/agent-configuration/${configId}`,
    method: 'DELETE'
  });
}

export async function loadAgentConfigurationList() {
  return callApi<AgentConfigurationListAPIResponse>({
    pathname: `/api/apm/settings/agent-configuration`
  });
}
