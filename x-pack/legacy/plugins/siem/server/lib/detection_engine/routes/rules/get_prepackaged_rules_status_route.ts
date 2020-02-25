/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';
import { LegacyServices, LegacyRequest } from '../../../../types';
import { GetScopedClients } from '../../../../services';
import { transformError } from '../utils';
import { getPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { findRules } from '../../rules/find_rules';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';

export const createGetPrepackagedRulesStatusRoute = (
  getClients: GetScopedClients
): Hapi.ServerRoute => {
  return {
    method: 'GET',
    path: `${DETECTION_ENGINE_PREPACKAGED_URL}/_status`,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
      },
    },
    async handler(request: LegacyRequest, headers) {
      const { alertsClient } = await getClients(request);

      if (!alertsClient) {
        return headers.response().code(404);
      }

      try {
        const rulesFromFileSystem = getPrepackagedRules();
        const customRules = await findRules({
          alertsClient,
          perPage: 1,
          page: 1,
          sortField: 'enabled',
          sortOrder: 'desc',
          filter: 'alert.attributes.tags:"__internal_immutable:false"',
        });
        const prepackagedRules = await getExistingPrepackagedRules({ alertsClient });
        const rulesToInstall = getRulesToInstall(rulesFromFileSystem, prepackagedRules);
        const rulesToUpdate = getRulesToUpdate(rulesFromFileSystem, prepackagedRules);
        return {
          rules_custom_installed: customRules.total,
          rules_installed: prepackagedRules.length,
          rules_not_installed: rulesToInstall.length,
          rules_not_updated: rulesToUpdate.length,
        };
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

export const getPrepackagedRulesStatusRoute = (
  route: LegacyServices['route'],
  getClients: GetScopedClients
): void => {
  route(createGetPrepackagedRulesStatusRoute(getClients));
};
