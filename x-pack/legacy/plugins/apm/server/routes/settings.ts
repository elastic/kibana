/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InternalCoreSetup } from 'src/core/server';
import Joi from 'joi';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceNames } from '../lib/settings/agent_configuration/get_service_names';
import { createConfiguration } from '../lib/settings/agent_configuration/create_configuration';
import { updateConfiguration } from '../lib/settings/agent_configuration/update_configuration';
import { AgentConfigurationIntake } from '../lib/settings/agent_configuration/configuration_types';
import { searchConfigurations } from '../lib/settings/agent_configuration/search';
import { listConfigurations } from '../lib/settings/agent_configuration/list_configurations';
import { getEnvironments } from '../lib/settings/agent_configuration/get_environments';
import { deleteConfiguration } from '../lib/settings/agent_configuration/delete_configuration';
import { createApmAgentConfigurationIndex } from '../lib/settings/agent_configuration/create_agent_config_index';

const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initSettingsApi(core: InternalCoreSetup) {
  const { server } = core.http;

  createApmAgentConfigurationIndex(server);

  // get list of configurations
  server.route({
    method: 'GET',
    path: '/api/apm/settings/agent-configuration',
    options: {
      validate: {
        query: {
          _debug: Joi.bool()
        }
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = setupRequest(req);
      return await listConfigurations({
        setup
      }).catch(defaultErrorHandler);
    }
  });

  // delete configuration
  server.route({
    method: 'DELETE',
    path: `/api/apm/settings/agent-configuration/{configurationId}`,
    options: {
      validate: {
        query: {
          _debug: Joi.bool()
        }
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = setupRequest(req);
      const { configurationId } = req.params;
      return await deleteConfiguration({
        configurationId,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  // get list of services
  server.route({
    method: 'GET',
    path: `/api/apm/settings/agent-configuration/services`,
    options: {
      validate: {
        query: {
          _debug: Joi.bool()
        }
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = setupRequest(req);
      return await getServiceNames({
        setup
      }).catch(defaultErrorHandler);
    }
  });

  // get environments for service
  server.route({
    method: 'GET',
    path: `/api/apm/settings/agent-configuration/services/{serviceName}/environments`,
    options: {
      validate: {
        query: {
          _debug: Joi.bool()
        }
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      return await getEnvironments({
        serviceName,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  // create configuration
  server.route({
    method: 'POST',
    path: `/api/apm/settings/agent-configuration/new`,
    options: {
      validate: {
        query: {
          _debug: Joi.bool()
        }
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = setupRequest(req);
      const configuration = req.payload as AgentConfigurationIntake;
      return await createConfiguration({
        configuration,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  // update configuration
  server.route({
    method: 'PUT',
    path: `/api/apm/settings/agent-configuration/{configurationId}`,
    options: {
      validate: {
        query: {
          _debug: Joi.bool()
        }
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = setupRequest(req);
      const { configurationId } = req.params;
      const configuration = req.payload as AgentConfigurationIntake;
      return await updateConfiguration({
        configurationId,
        configuration,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  // Lookup single configuration
  [
    '/api/apm/settings/agent-configuration/search',
    '/api/apm/settings/cm/search' // backward compatible api route for apm-server
  ].forEach(path => {
    server.route({
      method: 'POST',
      path,
      options: {
        validate: {
          query: {
            _debug: Joi.bool()
          }
        },
        tags: ['access:apm']
      },
      handler: async (req, h) => {
        interface Payload {
          service: {
            name: string;
            environment?: string;
          };
        }

        const setup = setupRequest(req);
        const payload = req.payload as Payload;
        const serviceName = payload.service.name;
        const environment = payload.service.environment;
        const config = await searchConfigurations({
          serviceName,
          environment,
          setup
        });

        if (!config) {
          return h.response().code(404);
        }

        return config;
      }
    });
  });
}
