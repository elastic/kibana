/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getServiceNames } from '../../lib/settings/agent_configuration/get_service_names';
import { createOrUpdateConfiguration } from '../../lib/settings/agent_configuration/create_or_update_configuration';
import { searchConfigurations } from '../../lib/settings/agent_configuration/search';
import { listConfigurations } from '../../lib/settings/agent_configuration/list_configurations';
import { getEnvironments } from '../../lib/settings/agent_configuration/get_environments';
import { deleteConfiguration } from '../../lib/settings/agent_configuration/delete_configuration';
import { createRoute } from '../create_route';
import { transactionSampleRateRt } from '../../../common/runtime_types/transaction_sample_rate_rt';
import { transactionMaxSpansRt } from '../../../common/runtime_types/transaction_max_spans_rt';
import { getAgentNameByService } from '../../lib/settings/agent_configuration/get_agent_name_by_service';
import { markAppliedByAgent } from '../../lib/settings/agent_configuration/mark_applied_by_agent';

// get list of configurations
export const agentConfigurationRoute = createRoute(core => ({
  path: '/api/apm/settings/agent-configuration',
  handler: async req => {
    const setup = await setupRequest(req);
    return await listConfigurations({ setup });
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

const agentPayloadRt = t.intersection([
  t.partial({ agent_name: t.string }),
  t.type({
    service: t.intersection([
      t.partial({ name: t.string }),
      t.partial({ environment: t.string })
    ])
  }),
  t.type({
    settings: t.intersection([
      t.partial({ transaction_sample_rate: transactionSampleRateRt }),
      t.partial({ capture_body: t.string }),
      t.partial({ transaction_max_spans: transactionMaxSpansRt })
    ])
  })
]);

// get environments for service
export const listAgentConfigurationEnvironmentsRoute = createRoute(() => ({
  path: '/api/apm/settings/agent-configuration/environments',
  params: {
    query: t.partial({ serviceName: t.string })
  },
  handler: async (req, { query }) => {
    const setup = await setupRequest(req);
    const { serviceName } = query;
    return await getEnvironments({ serviceName, setup });
  }
}));

// get agentName for service
export const agentConfigurationAgentNameRoute = createRoute(() => ({
  path: '/api/apm/settings/agent-configuration/agent_name',
  params: {
    query: t.type({ serviceName: t.string })
  },
  handler: async (req, { query }) => {
    const setup = await setupRequest(req);
    const { serviceName } = query;
    const agentName = await getAgentNameByService({ serviceName, setup });
    return agentName;
  }
}));

export const createAgentConfigurationRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/agent-configuration/new',
  params: {
    body: agentPayloadRt
  },
  handler: async (req, { body }) => {
    const setup = await setupRequest(req);
    return await createOrUpdateConfiguration({ configuration: body, setup });
  }
}));

export const updateAgentConfigurationRoute = createRoute(() => ({
  method: 'PUT',
  path: '/api/apm/settings/agent-configuration/{configurationId}',
  params: {
    path: t.type({
      configurationId: t.string
    }),
    body: agentPayloadRt
  },
  handler: async (req, { path, body }) => {
    const setup = await setupRequest(req);
    const { configurationId } = path;
    return await createOrUpdateConfiguration({
      configurationId,
      configuration: body,
      setup
    });
  }
}));

// Lookup single configuration (used by APM Server)
export const agentConfigurationSearchRoute = createRoute(core => ({
  method: 'POST',
  path: '/api/apm/settings/agent-configuration/search',
  params: {
    body: t.type({
      service: t.intersection([
        t.type({ name: t.string }),
        t.partial({ environment: t.string })
      ]),
      etag: t.string
    })
  },
  handler: async (req, { body }, h) => {
    const setup = await setupRequest(req);
    const config = await searchConfigurations({
      serviceName: body.service.name,
      environment: body.service.environment,
      setup
    });

    if (!config) {
      return h.response().code(404);
    }

    // update `applied_by_agent` field if etags match
    if (body.etag === config._source.etag && !config._source.applied_by_agent) {
      markAppliedByAgent({ id: config._id, body: config._source, setup });
    }

    return config;
  }
}));
