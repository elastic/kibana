/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerMLEnabledRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/ml_enabled`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client },
        } = await core;

        const settingsResponse = await client.asCurrentUser.cluster.getSettings({
          include_defaults: true,
        });

        const mlEnabled = settingsResponse.defaults?.xpack?.ml?.enabled;
        return response.ok({
          body: {
            mlEnabled: mlEnabled === 'true',
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
