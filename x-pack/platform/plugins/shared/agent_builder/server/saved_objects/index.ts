/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core-saved-objects-server';
import { agentBuilderSpaceSettingsType } from './space_settings';

/**
 * Registers all saved object types owned by the Agent Builder plugin.
 *
 * Currently only registers the per-space settings singleton. Kept as a
 * dedicated helper so future SO types (rather than the ES `.chat-*` indices)
 * can be added in one place.
 */
export const registerSavedObjectTypes = ({
  savedObjects,
}: {
  savedObjects: SavedObjectsServiceSetup;
}) => {
  savedObjects.registerType(agentBuilderSpaceSettingsType);
};

export {
  AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
  agentBuilderSpaceSettingsType,
  getAgentBuilderSpaceSettingsObjectId,
} from './space_settings';
export type { AgentBuilderSpaceSettingsAttributes } from './space_settings';
