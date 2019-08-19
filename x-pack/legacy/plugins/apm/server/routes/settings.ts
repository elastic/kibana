/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceNames } from '../lib/settings/agent_configuration/get_service_names';
import { createConfiguration } from '../lib/settings/agent_configuration/create_configuration';
import { updateConfiguration } from '../lib/settings/agent_configuration/update_configuration';
import { searchConfigurations } from '../lib/settings/agent_configuration/search';
import { listConfigurations } from '../lib/settings/agent_configuration/list_configurations';
import { getEnvironments } from '../lib/settings/agent_configuration/get_environments';
import { deleteConfiguration } from '../lib/settings/agent_configuration/delete_configuration';
import { createApmAgentConfigurationIndex } from '../lib/settings/agent_configuration/create_agent_config_index';
import { createRoute } from './create_route';
import { createRangeType } from '../../common/util/create_range_type';

// get list of configurations
export const agentConfigurationRoute = createRoute(core => ({
  path: '/api/apm/settings/agent-configuration',
  handler: async req => {
    await createApmAgentConfigurationIndex(core.http.server);

    const setup = await setupRequest(req);
    return await listConfigurations({
      setup
    });
  }
}));

// delete configuration
export const deleteAgentConfigurationRoute = createRoute(() => ({
  method: 'DELETE',
  path: '/api/apm/settings/agent-configuration/{configurationId}',
  params: {
    path: t.type({
      configurationId: t.string
    })
  },
  handler: async (req, { path }) => {
    const setup = await setupRequest(req);
    const { configurationId } = path;
    return await deleteConfiguration({
      configurationId,
      setup
    });
  }
}));

// get list of services
export const listAgentConfigurationServicesRoute = createRoute(() => ({
  method: 'GET',
  path: '/api/apm/settings/agent-configuration/services',
  handler: async req => {
    const setup = await setupRequest(req);
    return await getServiceNames({
      setup
    });
  }
}));

// get environments for service
export const listAgentConfigurationEnvironmentsRoute = createRoute(() => ({
  path:
    '/api/apm/settings/agent-configuration/services/{serviceName}/environments',
  params: {
    path: t.type({
      serviceName: t.string
    })
  },
  handler: async (req, { path }) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;
    return await getEnvironments({
      serviceName,
      setup
    });
  }
}));

// create configuration
const agentPayloadRt = t.type({
  settings: t.type({
    transaction_sample_rate: createRangeType(0, 1, 3)
  }),
  service: t.intersection([
    t.type({ name: t.string }),
    t.partial({ environment: t.string })
  ])
});

export const createAgentConfigurationRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/agent-configuration/new',
  params: {
    body: agentPayloadRt
  },
  handler: async (req, { body }) => {
    const setup = await setupRequest(req);
    return await createConfiguration({
      configuration: body,
      setup
    });
  }
}));

export const updateAgentConfigurationRoute = createRoute(() => ({
  method: 'PUT',
  path: `/api/apm/settings/agent-configuration/{configurationId}`,
  params: {
    path: t.type({
      configurationId: t.string
    }),
    body: agentPayloadRt
  },
  handler: async (req, { path, body }) => {
    const setup = await setupRequest(req);
    const { configurationId } = path;
    return await updateConfiguration({
      configurationId,
      configuration: body,
      setup
    });
  }
}));

// Lookup single configuration
export const agentConfigurationSearchRoute = createRoute(core => ({
  path: '/api/apm/settings/agent-configuration/search',
  params: {
    body: t.type({
      service: t.intersection([
        t.type({ name: t.string }),
        t.partial({ environment: t.string })
      ])
    })
  },
  handler: async (req, { body }, h) => {
    const [setup] = await Promise.all([
      setupRequest(req),
      createApmAgentConfigurationIndex(core.http.server)
    ]);

    const config = await searchConfigurations({
      serviceName: body.service.name,
      environment: body.service.environment,
      setup
    });

    if (!config) {
      return h.response().code(404);
    }

    return config;
  }
}));
