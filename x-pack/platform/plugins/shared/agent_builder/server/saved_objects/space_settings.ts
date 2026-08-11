/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { i18n } from '@kbn/i18n';

/**
 * Attributes stored on the per-space Agent Builder settings singleton.
 *
 * `defaultAgentId` is the ID of the agent that non-admin users should be routed
 * to (and restricted to) when they open Agent Builder from this space. When
 * unset (undefined attribute or the saved object is missing) the space uses the
 * hardcoded default agent behavior.
 */
export interface AgentBuilderSpaceSettingsAttributes {
  defaultAgentId?: string;
}

/**
 * Name of the Agent Builder per-space settings saved object type.
 *
 * Kept hidden (`hidden: true`) so it is only reachable through a saved-objects
 * client that explicitly includes it in `includedHiddenTypes`. Access is gated
 * via the internal HTTP routes and their `AGENTS_WRITE_SECURITY` guard rather
 * than the general saved objects APIs.
 */
export const AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE = 'agent_builder_space_settings';

/**
 * Fixed id of the settings singleton. With `namespaceType: 'single'` a
 * request-scoped saved-objects client is already isolated to the caller's
 * space, so a constant id resolves to exactly one document per space.
 */
export const AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID = 'agent-builder-space-settings';

/**
 * Saved object type definition for the per-space Agent Builder settings.
 *
 * We use `namespaceType: 'single'` so each space gets its own isolated document.
 * Mappings are `dynamic: false` because the attributes are only consumed by the
 * plugin's own services and never queried by field.
 */
export const agentBuilderSpaceSettingsType: SavedObjectsType<AgentBuilderSpaceSettingsAttributes> =
  {
    name: AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        defaultAgentId: { type: 'keyword' },
      },
    },
    management: {
      displayName: i18n.translate('xpack.agentBuilder.savedObjects.spaceSettings.displayName', {
        defaultMessage: 'Agent Builder Space Settings',
      }),
      importableAndExportable: false,
    },
  };
