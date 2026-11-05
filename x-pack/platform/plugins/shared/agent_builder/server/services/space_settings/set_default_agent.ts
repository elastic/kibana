/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { AgentAccessControlMode, createBadRequestError } from '@kbn/agent-builder-common';
import type { AgentsServiceStart } from '../agents';
import type { AgentBuilderSpaceSettings, SpaceSettingsService } from './space_settings_service';

/**
 * Assigns the default agent of the request's space, rejecting an agent nobody else can run.
 *
 * Shared by the space settings HTTP API and the plugin's start contract, so both apply the same
 * rule: a private agent is only visible to its owner, so it cannot be the default of a space.
 */
export const setSpaceDefaultAgent = async ({
  spaceSettings,
  agents,
  request,
  defaultAgentId,
}: {
  spaceSettings: SpaceSettingsService;
  agents: Pick<AgentsServiceStart, 'getRegistry'>;
  request: KibanaRequest;
  defaultAgentId: string | null;
}): Promise<AgentBuilderSpaceSettings> => {
  if (defaultAgentId !== null) {
    const registry = await agents.getRegistry({ request });
    const profile = await registry.get(defaultAgentId);
    if (profile.access_control?.access_mode === AgentAccessControlMode.Private) {
      throw createBadRequestError(
        'A private agent cannot be assigned as the space default. Change the agent access to public or shared, or pick another agent.'
      );
    }
  }

  return spaceSettings.set(request, defaultAgentId);
};
