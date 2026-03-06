/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapabilitiesSwitcher, CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { hasAgentVisibilityAccessOverrideFromRequest } from '../services/utils';

/**
 * Creates a capability switcher that sets `agentBuilder.hasAgentVisibilityAccessOverride` based on
 * an unregistered ES application privilege (only wildcard roles get true).
 *
 * When does this switcher run?
 * - Only when capabilities are explicitly resolved for a request. There is no global HTTP
 *   middleware that runs the resolver on every request.
 * - The main trigger is POST /api/core/capabilities (called once by the browser at app load).
 * - Other triggers: route handlers or services that call
 *   coreStart.capabilities.resolveCapabilities(request, ...). When they request a narrow
 *   path (e.g. uptime.*), only switchers for that path run; agentBuilder.* is not run.
 * So this does not slow down "all APIs" — only capability resolutions (and only when the
 * requested capabilityPath intersects agentBuilder.*, e.g. '*' or 'agentBuilder.*').
 */
export const createVisibilityAccessOverrideSwitcher = (
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
      const hasAgentVisibilityAccessOverride = await hasAgentVisibilityAccessOverrideFromRequest({
        esClient: scopedClient.asCurrentUser,
      });

      if (hasAgentVisibilityAccessOverride) {
        return {};
      }

      return {
        agentBuilder: {
          hasAgentVisibilityAccessOverride: false,
        },
      };
    } catch (e) {
      logger.debug(`Visibility access override capability switcher failed: ${e}`);
      return {
        agentBuilder: {
          hasAgentVisibilityAccessOverride: false,
        },
      };
    }
  };
};
