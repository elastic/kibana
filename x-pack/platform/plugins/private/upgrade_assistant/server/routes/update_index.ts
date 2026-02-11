/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';

import { versionCheckHandlerWrapper } from '@kbn/upgrade-assistant-pkg-server';
import { API_BASE_PATH } from '../../common/constants';
import type { RouteDependencies } from '../types';
import { updateIndex } from '../lib/update_index';
import { versionService } from '../lib/version';

export function registerUpdateIndexRoute({
  router,
  lib: { handleEsError },
  log,
  current,
}: RouteDependencies) {
  const BASE_PATH = `${API_BASE_PATH}/update_index`;
  router.post(
    {
      path: `${BASE_PATH}/{index}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      options: {
        access: 'public',
        summary: `Perform certain update operations on a given index. Currently supported ones are: 'blockWrite' and 'unfreeze'`,
      },
      validate: {
        params: schema.object({
          index: schema.string({ maxLength: 1000 }),
        }),
        body: schema.object({
          operations: schema.arrayOf(
            schema.oneOf([schema.literal('blockWrite'), schema.literal('unfreeze')]),
            { maxSize: 1000 }
          ),
        }),
      },
    },
    versionCheckHandlerWrapper(current.major)(async ({ core }, request, response) => {
      const {
        elasticsearch: { client },
      } = await core;
      const { index } = request.params;
      const { operations } = request.body;
      try {
        await updateIndex({
          esClient: client.asCurrentUser,
          index,
          operations,
          log,
          versionService,
        });
        return response.ok();
      } catch (err) {
        if (err instanceof errors.ResponseError) {
          return handleEsError({ error: err, response });
        }
        throw err;
      }
    })
  );
}
