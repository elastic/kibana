/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import Boom from 'boom';

import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';
import { ServerFacade, RequestFacade } from '../../../../types';
import { getIndexExists } from '../../index/get_index_exists';
import { callWithRequestFactory, getIndex, transformError } from '../utils';
import { getPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { installPrepackagedRules } from '../../rules/install_prepacked_rules';
import { updatePrepackagedRules } from '../../rules/update_prepacked_rules';
import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';

export const createAddPrepackedRulesRoute = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'PUT',
    path: DETECTION_ENGINE_PREPACKAGED_URL,
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
      const actionsClient = isFunction(request.getActionsClient)
        ? request.getActionsClient()
        : null;

      if (!alertsClient || !actionsClient) {
        return headers.response().code(404);
      }

      try {
        const callWithRequest = callWithRequestFactory(request, server);
        const rulesFromFileSystem = getPrepackagedRules();

        const prepackedRules = await getExistingPrepackagedRules({ alertsClient });
        const rulesToInstall = getRulesToInstall(rulesFromFileSystem, prepackedRules);
        const rulesToUpdate = getRulesToUpdate(rulesFromFileSystem, prepackedRules);

        const spaceIndex = getIndex(request, server);
        if (rulesToInstall.length !== 0 || rulesToUpdate.length !== 0) {
          const spaceIndexExists = await getIndexExists(callWithRequest, spaceIndex);
          if (!spaceIndexExists) {
            throw new Boom(
              `Pre-packaged rules cannot be installed until the space index is created: ${spaceIndex}`
            );
          }
        }
        await installPrepackagedRules(alertsClient, actionsClient, rulesToInstall, spaceIndex);
        // TODO: Test the updated package rules and only update them if we really need them updated
        await updatePrepackagedRules(alertsClient, actionsClient, rulesToUpdate, spaceIndex);
        return {
          rules_installed: rulesToInstall.length,
          rules_updated: rulesToUpdate.length,
        };
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const addPrepackedRulesRoute = (server: ServerFacade): void => {
  server.route(createAddPrepackedRulesRoute(server));
};
