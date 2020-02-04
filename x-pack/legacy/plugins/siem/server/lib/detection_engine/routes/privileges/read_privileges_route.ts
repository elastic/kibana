/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { merge } from 'lodash/fp';
import { DETECTION_ENGINE_PRIVILEGES_URL } from '../../../../../common/constants';
import { RulesRequest } from '../../rules/types';
import { LegacySetupServices } from '../../../../plugin';
import { callWithRequestFactory, transformError, getIndex } from '../utils';
import { readPrivileges } from '../../privileges/read_privileges';

export const createReadPrivilegesRulesRoute = (services: LegacySetupServices): Hapi.ServerRoute => {
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
    async handler(request: RulesRequest) {
      try {
        const callWithRequest = callWithRequestFactory(request, services);
        const index = getIndex(request, services);
        const permissions = await readPrivileges(callWithRequest, index);
        const usingEphemeralEncryptionKey = services.usingEphemeralEncryptionKey;
        return merge(permissions, {
          is_authenticated: request?.auth?.isAuthenticated ?? false,
          has_encryption_key: !usingEphemeralEncryptionKey,
        });
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const readPrivilegesRoute = (services: LegacySetupServices): void => {
  services.route(createReadPrivilegesRulesRoute(services));
};
