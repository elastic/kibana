/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { i18n } from '@kbn/i18n';

/* Attributes stored on the per-space Agent Builder settings singleton. */
export interface AgentBuilderSpaceSettingsAttributes {
  defaultAgentId?: string;
}

export const AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE = 'agent_builder_space_settings';

export const AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID = 'agent-builder-space-settings';

/* Saved object type definition for the per-space Agent Builder settings. */
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
      importableAndExportable: false,
    },
  };
