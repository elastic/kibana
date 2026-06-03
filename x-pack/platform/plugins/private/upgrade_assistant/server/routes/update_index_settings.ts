/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { versionCheckHandlerWrapper } from '@kbn/upgrade-assistant-pkg-server';
import { API_BASE_PATH } from '../../common/constants';
import type { RouteDependencies } from '../types';

export function registerUpdateSettingsRoute({ router, current }: RouteDependencies) {
  router.post(
    {
      path: `${API_BASE_PATH}/{indexName}/index_settings`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        body: schema.object({
          settings: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
        }),
      },
    },
    versionCheckHandlerWrapper(current.major)(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client },
        } = await core;
        const { indexName } = request.params;
        const { settings } = request.body;

        const settingsToDelete = settings.reduce((settingsBody, currentSetting) => {
          settingsBody[currentSetting] = null;
          return settingsBody;
        }, {} as { [key: string]: null });

        const settingsResponse = await client.asCurrentUser.indices.putSettings({
          index: indexName,
          body: settingsToDelete,
        });

        return response.ok({
          body: settingsResponse,
        });
      } catch (e) {
        const status = e.status || e.statusCode;
        if (status === 403) {
          return response.forbidden({ body: e });
        }

        throw e;
      }
    })
  );
}
