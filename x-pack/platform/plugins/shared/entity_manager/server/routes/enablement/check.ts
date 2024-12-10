/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import {
  ERROR_API_KEY_NOT_FOUND,
  ERROR_API_KEY_NOT_VALID,
  ERROR_BUILTIN_UPGRADE_REQUIRED,
  ERROR_DEFINITION_STOPPED,
  ERROR_PARTIAL_BUILTIN_INSTALLATION,
} from '../../../common/errors';
import { checkIfEntityDiscoveryAPIKeyIsValid, readEntityDiscoveryAPIKey } from '../../lib/auth';
import { builtInDefinitions } from '../../lib/entities/built_in';
import { findEntityDefinitions } from '../../lib/entities/find_entity_definition';
import { getClientsFromAPIKey } from '../../lib/utils';
import { EntityDefinitionWithState } from '../../lib/entities/types';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

/**
 * @openapi
 * /internal/entities/managed/enablement:
 *   get:
 *     description: Check if managed (built-in) entity discovery is enabled. Enabled entity discovery requires a valid api key and the latest version of the builtin definitions installed and running.
 *     tags:
 *       - management
 *     responses:
 *       200:
 *         description: OK - Verify result in response body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: enabled
 *               properties:
 *                 enabled:
 *                  type: boolean
 *                  example: false
 *                 reason:
 *                  type: string
 *                  example: api_key_not_found
 */
export const checkEntityDiscoveryEnabledRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/managed/enablement',
  security: {
    authz: {
      enabled: false,
      reason:
        'This endpoint leverages the security plugin to evaluate the privileges needed as part of its core flow',
    },
  },
  handler: async ({ response, logger, server }) => {
    try {
      logger.debug('reading entity discovery API key from saved object');
      const apiKey = await readEntityDiscoveryAPIKey(server);

      if (apiKey === undefined) {
        return response.ok({ body: { enabled: false, reason: ERROR_API_KEY_NOT_FOUND } });
      }

      logger.debug('validating existing entity discovery API key');
      const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);

      if (!isValid) {
        return response.ok({ body: { enabled: false, reason: ERROR_API_KEY_NOT_VALID } });
      }

      const { esClient, soClient } = getClientsFromAPIKey({ apiKey, server });

      const entityDiscoveryState = await Promise.all(
        builtInDefinitions.map(async (builtInDefinition) => {
          const definitions = await findEntityDefinitions({
            soClient,
            esClient,
            id: builtInDefinition.id,
            includeState: true,
          });

          return {
            installedDefinition: definitions[0] as EntityDefinitionWithState,
            builtInDefinition,
          };
        })
      ).then((results) =>
        results.reduce(
          (state, { installedDefinition, builtInDefinition }) => {
            return {
              installed: Boolean(state.installed && installedDefinition?.state.installed),
              running: Boolean(state.running && installedDefinition?.state.running),
              outdated:
                state.outdated ||
                (installedDefinition &&
                  semver.neq(installedDefinition.version, builtInDefinition.version)),
            };
          },
          { installed: true, running: true, outdated: false }
        )
      );

      if (!entityDiscoveryState.installed) {
        return response.ok({
          body: { enabled: false, reason: ERROR_PARTIAL_BUILTIN_INSTALLATION },
        });
      }

      if (!entityDiscoveryState.running) {
        return response.ok({ body: { enabled: false, reason: ERROR_DEFINITION_STOPPED } });
      }

      if (entityDiscoveryState.outdated) {
        return response.ok({ body: { enabled: false, reason: ERROR_BUILTIN_UPGRADE_REQUIRED } });
      }

      return response.ok({ body: { enabled: true } });
    } catch (err) {
      logger.error(err);
      return response.customError({ statusCode: 500, body: err });
    }
  },
});
