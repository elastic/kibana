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
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
  getAgentBuilderSpaceSettingsObjectId,
  type AgentBuilderSpaceSettingsAttributes,
} from '../../saved_objects';
import { getCurrentSpaceId } from '../../utils/spaces';

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
  spaces,
  logger,
}: {
  savedObjects: SavedObjectsServiceStart;
  spaces?: SpacesPluginStart;
  logger: Logger;
}): SpaceSettingsService => {
  const getScopedClient = (request: KibanaRequest): SavedObjectsClientContract =>
    savedObjects.getScopedClient(request, {
      includedHiddenTypes: [AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE],
    });

  const readForRequest = async (request: KibanaRequest): Promise<AgentBuilderSpaceSettings> => {
    const spaceId = getCurrentSpaceId({ request, spaces });
    const client = getScopedClient(request);
    try {
      const so = await client.get<AgentBuilderSpaceSettingsAttributes>(
        AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
        getAgentBuilderSpaceSettingsObjectId(spaceId)
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
    const spaceId = getCurrentSpaceId({ request, spaces });
    const client = getScopedClient(request);
    const id = getAgentBuilderSpaceSettingsObjectId(spaceId);
    const attributes: AgentBuilderSpaceSettingsAttributes = {
      defaultAgentId: defaultAgentId ?? undefined,
    };

    // Upsert the singleton: `overwrite: true` on create handles the initial
    // write as well as updates to an existing document.
    const saved = await client.create<AgentBuilderSpaceSettingsAttributes>(
      AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
      attributes,
      { id, overwrite: true }
    );
    logger.debug(
      `Updated Agent Builder space default agent for space=${spaceId} to ${
        defaultAgentId ?? '<cleared>'
      }`
    );
    return toDomain(saved.attributes);
  };

  return {
    get: readForRequest,
    set,
  };
};
