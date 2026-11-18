/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SessionMemoryScope } from '@kbn/context-engine-plugin/server/session_memory/types';
import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';

/** The session store scope of the user running the tool: their user profile in this space. */
export const getSessionMemoryScope = async ({
  request,
  spaceId,
  getCoreStart,
}: {
  request: KibanaRequest;
  spaceId: string;
  getCoreStart: () => Promise<CoreStart>;
}): Promise<SessionMemoryScope> => {
  const coreStart = await getCoreStart();
  const userId = await coreStart.userProfile.getCurrentProfileId({ request });
  if (!userId) {
    throw new Error('The current user has no user profile, so session memory has no user to use.');
  }
  return { space: spaceId, userId };
};
