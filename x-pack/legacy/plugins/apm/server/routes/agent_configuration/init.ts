/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { agentConfigurationListRoute } from './agent_configuration_list_route';
import { deleteAgentConfigurationRoute } from './delete_agent_configuration_route';
import { serviceNamesRoute } from './service_names_route';
import { environmentsRoute } from './environments_route';
import { createAgentConfigurationRoute } from './create_agent_configuration_route';
import { updateAgentConfigurationRoute } from './update_agent_configuration_route';
import { searchAgentConfigurationsRoute } from './search_agent_configurations_route';

export function initSettingsApi(core: InternalCoreSetup) {
  const { server } = core.http;

  // get list of configurations
  server.route(agentConfigurationListRoute);

  // delete configuration
  server.route(deleteAgentConfigurationRoute);

  // get list of services
  server.route(serviceNamesRoute);

  // get environments for service
  server.route(environmentsRoute);

  // create configuration
  server.route(createAgentConfigurationRoute);

  // update configuration
  server.route(updateAgentConfigurationRoute);

  // Lookup single configuration (used by APM Server)
  server.route(searchAgentConfigurationsRoute);
}
