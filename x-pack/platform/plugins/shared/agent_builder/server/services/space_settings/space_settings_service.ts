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
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
  AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID,
  type AgentBuilderSpaceSettingsAttributes,
} from '../../saved_objects';

export interface AgentBuilderSpaceSettings {
  defaultAgentId: string | null;
}

export interface SpaceSettingsService {
  get(request: KibanaRequest): Promise<AgentBuilderSpaceSettings>;
  set(request: KibanaRequest, defaultAgentId: string | null): Promise<AgentBuilderSpaceSettings>;
}

/* Reads and writes the single per-space Agent Builder settings SO */
export const createSpaceSettingsService = ({
  savedObjects,
}: {
  savedObjects: SavedObjectsServiceStart;
}): SpaceSettingsService => {
  const getScopedClient = (request: KibanaRequest): SavedObjectsClientContract =>
    savedObjects.getScopedClient(request, {
      includedHiddenTypes: [AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE],
    });

  const get = async (request: KibanaRequest): Promise<AgentBuilderSpaceSettings> => {
    const client = getScopedClient(request);
    try {
      const so = await client.get<AgentBuilderSpaceSettingsAttributes>(
        AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
        AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID
      );
      return { defaultAgentId: so.attributes?.defaultAgentId ?? null };
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return { defaultAgentId: null };
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

    const saved = await client.create<AgentBuilderSpaceSettingsAttributes>(
      AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
      attributes,
      { id: AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID, overwrite: true }
    );
    return { defaultAgentId: saved.attributes?.defaultAgentId ?? null };
  };

  return { get, set };
};
