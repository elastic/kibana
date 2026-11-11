/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AgentAccessControlMode, createBadRequestError } from '@kbn/agent-builder-common';
import type { SpaceSettingsResponse } from '../../../common/http_api/space_settings';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, AGENTS_WRITE_SECURITY } from '../route_security';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';

export function registerSpaceSettingsRoutes({
  router,
  logger,
  getInternalServices,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: `${internalApiPath}/space_settings`,
      security: AGENT_BUILDER_READ_SECURITY,
      validate: false,
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const { spaceSettings } = getInternalServices();
      const { defaultAgentId } = await spaceSettings.get(request);
      return response.ok<SpaceSettingsResponse>({
        body: { default_agent_id: defaultAgentId },
      });
    })
  );

  router.put(
    {
      path: `${internalApiPath}/space_settings`,
      security: AGENTS_WRITE_SECURITY,
      validate: {
        body: schema.object({
          default_agent_id: schema.nullable(
            schema.string({
              minLength: 1,
              maxLength: 256,
              meta: {
                description:
                  'ID of the agent to assign as the space default. Pass null to clear the assignment.',
              },
            })
          ),
        }),
      },
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const { spaceSettings, agents } = getInternalServices();
      const defaultAgentId = request.body.default_agent_id;

      if (defaultAgentId !== null) {
        const registry = await agents.getRegistry({ request });
        const profile = await registry.get(defaultAgentId);
        if (profile.access_control?.access_mode === AgentAccessControlMode.Private) {
          throw createBadRequestError(
            'A private agent cannot be assigned as the space default. Change the agent access to public or shared, or pick another agent.'
          );
        }
      }

      const updated = await spaceSettings.set(request, defaultAgentId);
      return response.ok<SpaceSettingsResponse>({
        body: { default_agent_id: updated.defaultAgentId },
      });
    })
  );
}
