/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';

import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';
import { ServerFacade, RequestFacade } from '../../../../types';
import { transformError } from '../utils';
import { getPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';

export const createGetPrepackagedRulesStatusRoute = (): Hapi.ServerRoute => {
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
    async handler(request: RequestFacade, headers) {
      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;

      if (!alertsClient) {
        return headers.response().code(404);
      }

      try {
        const rulesFromFileSystem = getPrepackagedRules();
        const prepackagedRules = await getExistingPrepackagedRules({ alertsClient });
        const rulesToInstall = getRulesToInstall(rulesFromFileSystem, prepackagedRules);
        const rulesToUpdate = getRulesToUpdate(rulesFromFileSystem, prepackagedRules);
        return {
          rules_installed: prepackagedRules.length,
          rules_not_installed: rulesToInstall.length,
          rules_not_updated: rulesToUpdate.length,
        };
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const getPrepackagedRulesStatusRoute = (server: ServerFacade): void => {
  server.route(createGetPrepackagedRulesStatusRoute());
};
