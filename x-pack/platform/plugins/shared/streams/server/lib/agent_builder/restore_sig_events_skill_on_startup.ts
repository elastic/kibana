/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import type { StreamsPluginStartDependencies } from '../../types';
import type { StreamsServer } from '../../types';
import { enableSigEventsSkill } from './sig_events_skill_enablement';
import { registerSigEventsTools } from './register_tools';

export async function restoreSigEventsSkillPerSpaceOnStartup({
  core,
  plugins,
  server,
  logger,
}: {
  core: CoreStart;
  plugins: StreamsPluginStartDependencies;
  server: StreamsServer | undefined;
  logger: Logger;
}): Promise<void> {
  if (
    !server?.agentBuilderSetup ||
    !server?.agentBuilderStart ||
    !server?.sigEventsSettingsService ||
    !server?.getScopedClients ||
    !plugins.spaces
  ) {
    return;
  }

  const defaultSpaceRequest = createRequestForSpace(core, DEFAULT_SPACE_ID);
  let spaces: Array<{ id: string }>;
  try {
    const spacesClient = plugins.spaces.spacesService.createSpacesClient(defaultSpaceRequest);
    spaces = await spacesClient.getAll();
  } catch (err) {
    logger.warn(`Could not get spaces for SigEvents skill restore: ${(err as Error).message}`);
    return;
  }

  let toolsRegistered = false;
  const logPrefix = 'restoreSigEventsSkillOnStartup';

  for (const space of spaces) {
    try {
      const request = createRequestForSpace(core, space.id);
      const clients = await server.getScopedClients!({ request });
      const settings = await clients.sigEventsSettingsClient.getSettings();
      if (!settings.sigEventsSkill?.enabled) {
        continue;
      }

      if (!toolsRegistered && server.agentBuilderSetup) {
        try {
          registerSigEventsTools(server.agentBuilderSetup, server.getScopedClients!, server);
        } catch (err) {
          const message = (err as Error).message;
          if (!message.includes('already registered')) {
            throw err;
          }
        }
        toolsRegistered = true;
      }

      await enableSigEventsSkill(server.agentBuilderStart!, request, {
        content: settings.sigEventsSkill.content,
        toolIds: settings.sigEventsSkill.toolIds,
      });
      logger.debug(`${logPrefix}: restored SigEvents skill for space ${space.id}`);
    } catch (err) {
      logger.warn(
        `${logPrefix}: failed to restore SigEvents skill for space ${space.id}: ${
          (err as Error).message
        }`,
        { error: err as Error }
      );
    }
  }
}

/**
 * Creates a fake Kibana request that resolves to the given space (basePath and
 * URL pathname). Used for startup-only restore of the SigEvents skill per space.
 * Space is derived from the request by getScopedClients / SO client / Spaces.
 */
function createRequestForSpace(core: CoreStart, spaceId: string): KibanaRequest {
  const path = addSpaceIdToPath('/', spaceId);
  const rawRequest: FakeRawRequest = {
    headers: {},
    path: '/',
  };
  const request = kibanaRequestFactory(rawRequest);
  core.http.basePath.set(request, path);
  return request;
}
