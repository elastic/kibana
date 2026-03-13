/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerRoute } from '../../../create_server_route';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import {
  enableSigEventsSkill,
  disableSigEventsSkill,
  type EnableSigEventsSkillResult,
  type DisableSigEventsSkillResult,
} from '../../../../agent_builder/sig_events_skill_enablement';
import { registerSigEventsTools } from '../../../../agent_builder/register_tools';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const enableRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_sig_events_skill/enable',
  options: {
    access: 'internal',
    summary: 'Enable SigEvents skill in Agent Builder',
    description:
      'Registers the SigEvents skill and adds it to the default agent. Optionally restrict tools via body.tool_ids and override skill content via body.content. Exposed for toggling via API (e.g. when the SigEvents feature is enabled).',
  },
  params: z.object({
    body: z
      .object({
        tool_ids: z
          .array(z.string())
          .optional()
          .describe(
            'Tool IDs this skill should expose. If omitted, all Sig Events tools are used. Must be a subset of the allowed Sig Events tool IDs.'
          ),
        content: z
          .string()
          .optional()
          .describe(
            'Override the default skill content (markdown) shown to the model. If omitted, the default content is used.'
          ),
      })
      .optional(),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    request,
    server,
    getScopedClients,
    params,
  }): Promise<EnableSigEventsSkillResult> => {
    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!server.agentBuilderStart) {
      throw new Error('Agent Builder is not available. Ensure the agentBuilder plugin is enabled.');
    }
    if (server.agentBuilderSetup) {
      try {
        // Note: There is no way to unregister tools so this is a one way operation.
        registerSigEventsTools(server.agentBuilderSetup, getScopedClients, server);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('already registered')) {
          throw err;
        }
      }
    }
    return enableSigEventsSkill(server.agentBuilderStart, request, {
      toolIds: params?.body?.tool_ids,
      content: params?.body?.content,
    });
  },
});

const disableRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_sig_events_skill/disable',
  options: {
    access: 'internal',
    summary: 'Disable SigEvents skill in Agent Builder',
    description: 'Removes the SigEvents skill from the default agent and unregisters the skill.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    request,
    server,
    getScopedClients,
    logger,
  }): Promise<DisableSigEventsSkillResult> => {
    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!server.agentBuilderStart) {
      throw new Error('Agent Builder is not available. Ensure the agentBuilder plugin is enabled.');
    }
    // We cannot unregister tools so we only clean up the skill and restore the default agent.
    return disableSigEventsSkill(server.agentBuilderStart, request, logger);
  },
});

export const sigEventsSkillRoutes = {
  ...enableRoute,
  ...disableRoute,
};
