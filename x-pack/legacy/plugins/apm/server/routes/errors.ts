/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { InternalCoreSetup } from 'src/core/server';
import { getErrorDistribution } from '../lib/errors/distribution/get_distribution';
import { getErrorGroup } from '../lib/errors/get_error_group';
import { getErrorGroups } from '../lib/errors/get_error_groups';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';

const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initErrorsApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/errors`,
    options: {
      validate: {
        query: withDefaultValidators({
          sortField: Joi.string(),
          sortDirection: Joi.string()
        })
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      const { sortField, sortDirection } = req.query as {
        sortField: string;
        sortDirection: string;
      };

      return getErrorGroups({
        serviceName,
        sortField,
        sortDirection,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/errors/{groupId}`,
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName, groupId } = req.params;
      return getErrorGroup({ serviceName, groupId, setup }).catch(
        defaultErrorHandler
      );
    }
  });

  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/errors/distribution`,
    options: {
      validate: {
        query: withDefaultValidators({
          groupId: Joi.string()
        })
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      const { groupId } = req.query as { groupId?: string };
      return getErrorDistribution({ serviceName, groupId, setup }).catch(
        defaultErrorHandler
      );
    }
  });
}
