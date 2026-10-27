/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';

import type { AiopsUsage } from '../../lib/track_route_usage';
import { routeHandlerFactory } from './route_handler_factory';
import { telemetrySchema } from './schema';

export const defineRoute = (router: IRouter<DataRequestHandlerContext>, aiopsUsage: AiopsUsage) => {
  router.versioned
    .post({
      path: AIOPS_API_ENDPOINT.TELEMETRY,
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'This route only increments a usage counter and does not access any data',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: telemetrySchema,
          },
        },
      },
      routeHandlerFactory(aiopsUsage)
    );
};
