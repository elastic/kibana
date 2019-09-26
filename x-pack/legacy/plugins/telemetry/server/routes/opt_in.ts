/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { boomify } from 'boom';
import { CoreSetup } from 'src/core/server';

export function registerOptInRoutes(core: CoreSetup) {
  const { server } = core.http as any;

  server.route({
    method: 'POST',
    path: '/api/telemetry/v2/optIn',
    options: {
      validate: {
        payload: Joi.object({
          enabled: Joi.bool().required(),
        }),
      },
    },
    handler: async (req: any, h: any) => {
      const savedObjectsClient = req.getSavedObjectsClient();
      try {
        await savedObjectsClient.create(
          'telemetry',
          {
            enabled: req.payload.enabled,
          },
          {
            id: 'telemetry',
            overwrite: true,
          }
        );
      } catch (err) {
        return boomify(err);
      }
      return h.response({}).code(200);
    },
  });
}
