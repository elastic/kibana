/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
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

const SIG_EVENTS_SKILL_DEFAULT_SPACE_ONLY_MESSAGE =
  'The Sig Events Agent Builder skill can only be turned on or off from the Default space. Switch to the Default space in Kibana and try again.';

const SIG_EVENTS_SKILL_SPACE_UNRESOLVED_MESSAGE =
  'Could not determine the active Kibana space. Enable the Spaces plugin to turn the Sig Events skill on or off.';

const enableRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_sig_events_skill/enable',
  options: {
    access: 'internal',
    summary: 'Enable SigEvents skill in Agent Builder',
    description:
      'Available only in the Default space. Registers Sig Events tools and the skill globally. The enabled state is stored on the Default space significant-events settings. Agents with enable_elastic_capabilities (or skill_ids including sig-events) can use this skill in any space.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({ request, server, getScopedClients }): Promise<EnableSigEventsSkillResult> => {
    if (!server.getActiveSpaceId) {
      throw badRequest(new Error('Sig Events skill routes are not available yet.'));
    }
    const activeSpaceId = server.getActiveSpaceId(request);
    if (activeSpaceId === undefined) {
      throw badRequest(new Error(SIG_EVENTS_SKILL_SPACE_UNRESOLVED_MESSAGE));
    }
    if (activeSpaceId !== DEFAULT_SPACE_ID) {
      throw badRequest(new Error(SIG_EVENTS_SKILL_DEFAULT_SPACE_ONLY_MESSAGE));
    }
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
      'Available only in the Default space. Turns off the skill in settings and unregisters it globally.',
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
    if (!server.getActiveSpaceId) {
      throw badRequest(new Error('Sig Events skill routes are not available yet.'));
    }
    const activeSpaceId = server.getActiveSpaceId(request);
    if (activeSpaceId === undefined) {
      throw badRequest(new Error(SIG_EVENTS_SKILL_SPACE_UNRESOLVED_MESSAGE));
    }
    if (activeSpaceId !== DEFAULT_SPACE_ID) {
      throw badRequest(new Error(SIG_EVENTS_SKILL_DEFAULT_SPACE_ONLY_MESSAGE));
    }
    const { licensing, uiSettingsClient, sigEventsSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!server.agentBuilderStart) {
      throw new Error('Agent Builder is not available. Ensure the agentBuilder plugin is enabled.');
    }
    await sigEventsSettingsClient.updateSettings({ sigEventsSkillEnabled: false });
    return disableSigEventsSkill(server.agentBuilderStart, logger);
  },
});

export const sigEventsSkillRoutes = {
  ...enableRoute,
  ...disableRoute,
};
