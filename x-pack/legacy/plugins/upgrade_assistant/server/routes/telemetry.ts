/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import Joi from '@hapi/joi';
import { UpgradeAssistantTelemetryServer } from '../../common/types';
import { upsertUIOpenOption } from '../lib/telemetry/es_ui_open_apis';
import { upsertUIReindexOption } from '../lib/telemetry/es_ui_reindex_apis';

export function registerTelemetryRoutes(server: UpgradeAssistantTelemetryServer) {
  server.route({
    path: '/api/upgrade_assistant/telemetry/ui_open',
    method: 'PUT',
    options: {
      validate: {
        payload: Joi.object({
          overview: Joi.boolean().default(false),
          cluster: Joi.boolean().default(false),
          indices: Joi.boolean().default(false),
        }),
      },
    },
    async handler(request) {
      try {
        return await upsertUIOpenOption(server, request);
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });

  server.route({
    path: '/api/upgrade_assistant/telemetry/ui_reindex',
    method: 'PUT',
    options: {
      validate: {
        payload: Joi.object({
          close: Joi.boolean().default(false),
          open: Joi.boolean().default(false),
          start: Joi.boolean().default(false),
          stop: Joi.boolean().default(false),
        }),
      },
    },
    async handler(request) {
      try {
        return await upsertUIReindexOption(server, request);
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });
}
