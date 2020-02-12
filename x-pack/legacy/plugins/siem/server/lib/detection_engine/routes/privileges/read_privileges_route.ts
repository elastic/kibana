/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { merge } from 'lodash/fp';

import { DETECTION_ENGINE_PRIVILEGES_URL } from '../../../../../common/constants';
import { LegacyServices } from '../../../../types';
import { RulesRequest } from '../../rules/types';
import { GetScopedClients } from '../../../../services';
import { transformError, getIndex } from '../utils';
import { readPrivileges } from '../../privileges/read_privileges';

export const createReadPrivilegesRulesRoute = (
  config: LegacyServices['config'],
  usingEphemeralEncryptionKey: boolean,
  getClients: GetScopedClients
): Hapi.ServerRoute => {
  return {
    method: 'GET',
    path: DETECTION_ENGINE_PRIVILEGES_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
      },
    },
    async handler(request: RulesRequest, headers) {
      try {
        const { clusterClient, spacesClient } = await getClients(request);

        const index = getIndex(spacesClient.getSpaceId, config);
        const permissions = await readPrivileges(clusterClient.callAsCurrentUser, index);
        return merge(permissions, {
          is_authenticated: request?.auth?.isAuthenticated ?? false,
          has_encryption_key: !usingEphemeralEncryptionKey,
        });
      } catch (err) {
        const error = transformError(err);
        return headers
          .response({
            message: error.message,
            status_code: error.statusCode,
          })
          .code(error.statusCode);
      }
    },
  };
};

export const readPrivilegesRoute = (
  route: LegacyServices['route'],
  config: LegacyServices['config'],
  usingEphemeralEncryptionKey: boolean,
  getClients: GetScopedClients
) => {
  route(createReadPrivilegesRulesRoute(config, usingEphemeralEncryptionKey, getClients));
};
