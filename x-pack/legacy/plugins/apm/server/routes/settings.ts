/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InternalCoreSetup } from 'src/core/server';
import Joi from 'joi';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceNames } from '../lib/settings/cm/get_service_names';
import { saveConfiguration } from '../lib/settings/cm/save_configuration';
import { CentralConfigurationIntake } from '../lib/settings/cm/configuration';
import { searchConfigurations } from '../lib/settings/cm/search';
import { listConfigurations } from '../lib/settings/cm/list_configurations';
import { getEnvironments } from '../lib/settings/cm/get_environments';
import { deleteConfiguration } from '../lib/settings/cm/delete_configuration';

const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initSettingsApi(core: InternalCoreSetup) {
  const { server } = core.http;

  // get list of configurations
  server.route({
    method: 'GET',
    path: `/api/apm/settings/cm`,
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
    path: `/api/apm/settings/cm/{configurationId}`,
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
    path: `/api/apm/settings/cm/services`,
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
    path: `/api/apm/settings/cm/services/{serviceName}/environments`,
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

  // store configuration
  server.route({
    method: 'POST',
    path: `/api/apm/settings/cm/new`,
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
      const configuration = req.payload as CentralConfigurationIntake;
      return await saveConfiguration({
        configuration,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  // Lookup single configuration
  server.route({
    method: 'POST',
    path: `/api/apm/settings/cm/search`,
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
}
