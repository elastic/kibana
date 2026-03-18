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
} from '../../../../lib/agent_builder/sig_events_skill_enablement';
import { registerSigEventsTools } from '../../../../lib/agent_builder/register_tools';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const enableRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_sig_events_skill/enable',
  options: {
    access: 'internal',
    summary: 'Enable SigEvents skill in Agent Builder',
    description:
      'Registers Sig Events tools and the SigEvents skill in the global Agent Builder registry. Does not modify the default agent. In any space, agents with enable_elastic_capabilities (or skill_ids that include sig-events) can use this skill and its tools.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({ request, server, getScopedClients }): Promise<EnableSigEventsSkillResult> => {
    const { licensing, uiSettingsClient, sigEventsSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!server.agentBuilderStart) {
      throw new Error('Agent Builder is not available. Ensure the agentBuilder plugin is enabled.');
    }
    if (server.agentBuilderSetup) {
      try {
        registerSigEventsTools(server.agentBuilderSetup, getScopedClients, server);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('already registered')) {
          throw err;
        }
      }
    }
    const result = await enableSigEventsSkill(server.agentBuilderStart);
    await sigEventsSettingsClient.updateSettings({ sigEventsSkillEnabled: true });
    return result;
  },
});

const disableRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_sig_events_skill/disable',
  options: {
    access: 'internal',
    summary: 'Disable SigEvents skill in Agent Builder',
    description:
      'Turns off Sig Events skill for this space in settings. Unregisters the global skill only if no other space still has it enabled.',
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
    const { licensing, uiSettingsClient, sigEventsSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!server.agentBuilderStart) {
      throw new Error('Agent Builder is not available. Ensure the agentBuilder plugin is enabled.');
    }
    await sigEventsSettingsClient.updateSettings({ sigEventsSkillEnabled: false });
    return disableSigEventsSkill(server.agentBuilderStart, server.core, logger);
  },
});

export const sigEventsSkillRoutes = {
  ...enableRoute,
  ...disableRoute,
};
