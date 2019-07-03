/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMUpdateConfigurationAPIResponse } from '../../../../server/lib/settings/agent_configuration/update_configuration';
import { callApi } from '../callApi';
import { AgentConfigurationIntake } from '../../../../server/lib/settings/agent_configuration/configuration_types';
import { CMServicesAPIResponse } from '../../../../server/lib/settings/agent_configuration/get_service_names';
import { CMCreateConfigurationAPIResponse } from '../../../../server/lib/settings/agent_configuration/create_configuration';
import { CMListAPIResponse } from '../../../../server/lib/settings/agent_configuration/list_configurations';
import { CMEnvironmentsAPIResponse } from '../../../../server/lib/settings/agent_configuration/get_environments';

export async function loadCMServices() {
  return callApi<CMServicesAPIResponse>({
    pathname: `/api/apm/settings/cm/services`
  });
}

export async function loadCMEnvironments({
  serviceName
}: {
  serviceName: string;
}) {
  return callApi<CMEnvironmentsAPIResponse>({
    pathname: `/api/apm/settings/cm/services/${serviceName}/environments`
  });
}

export async function createCMConfiguration(
  configuration: AgentConfigurationIntake
) {
  return callApi<CMCreateConfigurationAPIResponse>({
    pathname: `/api/apm/settings/cm/new`,
    method: 'POST',
    body: JSON.stringify(configuration)
  });
}

export async function updateCMConfiguration(
  configurationId: string,
  configuration: AgentConfigurationIntake
) {
  return callApi<CMUpdateConfigurationAPIResponse>({
    pathname: `/api/apm/settings/cm/${configurationId}`,
    method: 'PUT',
    body: JSON.stringify(configuration)
  });
}

export async function deleteCMConfiguration(configId: string) {
  return callApi({
    pathname: `/api/apm/settings/cm/${configId}`,
    method: 'DELETE'
  });
}

export async function loadCMList() {
  return callApi<CMListAPIResponse>({
    pathname: `/api/apm/settings/cm`
  });
}
