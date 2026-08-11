/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  SavedObjectsServiceStart,
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
  AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID,
  type AgentBuilderSpaceSettingsAttributes,
} from '../../saved_objects';

/**
 * Domain shape returned to route handlers and enforcement logic. `null` means
 * the space has no assigned default agent and should fall back to the
 * plugin's normal default agent behavior.
 */
export interface AgentBuilderSpaceSettings {
  defaultAgentId: string | null;
}

/**
 * Contract for reading/writing the per-space Agent Builder settings singleton.
 *
 * All methods are request-scoped: they infer the target space from the request
 * (via the spaces plugin) and read/write with a saved-objects client scoped to
 * the request. Agents themselves are space-isolated, so all callers that need
 * to read or update the assignment already operate in a request context.
 */
export interface SpaceSettingsService {
  get(request: KibanaRequest): Promise<AgentBuilderSpaceSettings>;
  /**
   * Persists (or clears with `null`) the default agent for the current
   * request's space. The service does not validate the agent id itself; the
   * caller should confirm the agent exists in the space before calling `set`.
   */
  set(request: KibanaRequest, defaultAgentId: string | null): Promise<AgentBuilderSpaceSettings>;
}

const NO_ASSIGNMENT: AgentBuilderSpaceSettings = { defaultAgentId: null };

const toDomain = (
  attributes: AgentBuilderSpaceSettingsAttributes | undefined
): AgentBuilderSpaceSettings => ({
  defaultAgentId: attributes?.defaultAgentId ?? null,
});

/**
 * Creates the per-space Agent Builder settings service.
 *
 * Both reads and writes use a request-scoped SO client that explicitly
 * includes the hidden settings type. The settings routes gate access via
 * `AGENT_BUILDER_READ_SECURITY` / `AGENTS_WRITE_SECURITY` so we rely on the
 * caller's own credentials rather than an internal system user.
 */
export const createSpaceSettingsService = ({
  savedObjects,
  logger,
}: {
  savedObjects: SavedObjectsServiceStart;
  logger: Logger;
}): SpaceSettingsService => {
  // `namespaceType: 'single'` on the SO type means the request-scoped client is
  // already isolated to the caller's space, so a fixed id reads/writes exactly
  // one document per space without resolving the space id here.
  const getScopedClient = (request: KibanaRequest): SavedObjectsClientContract =>
    savedObjects.getScopedClient(request, {
      includedHiddenTypes: [AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE],
    });

  const readForRequest = async (request: KibanaRequest): Promise<AgentBuilderSpaceSettings> => {
    const client = getScopedClient(request);
    try {
      const so = await client.get<AgentBuilderSpaceSettingsAttributes>(
        AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
        AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID
      );
      return toDomain(so.attributes);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return NO_ASSIGNMENT;
      }
      throw err;
    }
  };

  const set = async (
    request: KibanaRequest,
    defaultAgentId: string | null
  ): Promise<AgentBuilderSpaceSettings> => {
    const client = getScopedClient(request);
    const attributes: AgentBuilderSpaceSettingsAttributes = {
      defaultAgentId: defaultAgentId ?? undefined,
    };

    // Upsert the singleton: `overwrite: true` on create handles the initial
    // write as well as updates to an existing document.
    const saved = await client.create<AgentBuilderSpaceSettingsAttributes>(
      AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
      attributes,
      { id: AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID, overwrite: true }
    );
    logger.debug(`Updated Agent Builder space default agent to ${defaultAgentId ?? '<cleared>'}`);
    return toDomain(saved.attributes);
  };

  return {
    get: readForRequest,
    set,
  };
};
