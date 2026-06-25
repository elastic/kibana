/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapabilitiesSwitcher, CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { isAdminFromRequest } from '../services/utils';

/**
 * Creates a capability switcher that sets `agentBuilder.isAdmin` based on
 * an unregistered ES application privilege (only wildcard roles get true).
 *
 * When does this switcher run?
 * - Only when capabilities are explicitly resolved for a request.
 * - The main trigger is POST /api/core/capabilities (called once by the browser at app load).
 * - Other triggers: route handlers or services that call
 *   coreStart.capabilities.resolveCapabilities(request, ...). When they request a narrow
 *   path (e.g. uptime.*), only switchers for that path run;
 */
export const createAdminPrivilegeSwitcher = (
  getStartServices: CoreSetup['getStartServices'],
  logger: Logger
): CapabilitiesSwitcher => {
  return async (request, _capabilities, useDefaultCapabilities) => {
    if (useDefaultCapabilities) {
      return {};
    }

    try {
      const [coreStart] = await getStartServices();
      const scopedClient = coreStart.elasticsearch.client.asScoped(request);
      const isAdmin = await isAdminFromRequest({
        esClient: scopedClient.asCurrentUser,
      });

      if (isAdmin) {
        return {
          agentBuilder: {
            isAdmin: true,
          },
        };
      }

      return {};
    } catch (e) {
      logger.debug(`Admin privilege capability switcher failed`, { error: e });
      return {
        agentBuilder: {
          isAdmin: false,
        },
      };
    }
  };
};
