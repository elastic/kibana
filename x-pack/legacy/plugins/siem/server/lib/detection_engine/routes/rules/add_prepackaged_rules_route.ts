/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Boom from 'boom';

import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';
import { LegacySetupServices, RequestFacade } from '../../../../plugin';
import { GetScopedClients } from '../../../../services';
import { getIndexExists } from '../../index/get_index_exists';
import { getIndex, transformError } from '../utils';
import { getPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { installPrepackagedRules } from '../../rules/install_prepacked_rules';
import { updatePrepackagedRules } from '../../rules/update_prepacked_rules';
import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';

export const createAddPrepackedRulesRoute = (
  config: LegacySetupServices['config'],
  getClients: GetScopedClients
): Hapi.ServerRoute => {
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
      try {
        const {
          actionsClient,
          alertsClient,
          clusterClient,
          savedObjectsClient,
          spacesClient,
        } = await getClients(request);

        if (!actionsClient || !alertsClient || !savedObjectsClient) {
          return headers.response().code(404);
        }

        const rulesFromFileSystem = getPrepackagedRules();

        const prepackagedRules = await getExistingPrepackagedRules({ alertsClient });
        const rulesToInstall = getRulesToInstall(rulesFromFileSystem, prepackagedRules);
        const rulesToUpdate = getRulesToUpdate(rulesFromFileSystem, prepackagedRules);

        const spaceIndex = getIndex(spacesClient.getSpaceId, config);
        if (rulesToInstall.length !== 0 || rulesToUpdate.length !== 0) {
          const spaceIndexExists = await getIndexExists(
            clusterClient.callAsCurrentUser,
            spaceIndex
          );
          if (!spaceIndexExists) {
            return Boom.badRequest(
              `Pre-packaged rules cannot be installed until the space index is created: ${spaceIndex}`
            );
          }
        }
        await Promise.all(
          installPrepackagedRules(alertsClient, actionsClient, rulesToInstall, spaceIndex)
        );
        await updatePrepackagedRules(
          alertsClient,
          actionsClient,
          savedObjectsClient,
          rulesToUpdate,
          spaceIndex
        );
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

export const addPrepackedRulesRoute = (
  route: LegacySetupServices['route'],
  config: LegacySetupServices['config'],
  getClients: GetScopedClients
): void => {
  route(createAddPrepackedRulesRoute(config, getClients));
};
