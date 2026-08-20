/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';

/* Attributes stored on the per-space Agent Builder settings singleton. */
export interface AgentBuilderSpaceSettingsAttributes {
  defaultAgentId?: string;
}

export const AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE = 'agent_builder_space_settings';

export const AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID = 'agent-builder-space-settings';

const MAX_AGENT_ID_LENGTH = 1024;

const spaceSettingsAttributesSchema = schema.object({
  defaultAgentId: schema.maybe(schema.string({ maxLength: MAX_AGENT_ID_LENGTH })),
});

/* Saved object type for the per-space Agent Builder settings */
export const agentBuilderSpaceSettingsType: SavedObjectsType<AgentBuilderSpaceSettingsAttributes> =
  {
    name: AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        defaultAgentId: { type: 'keyword', ignore_above: MAX_AGENT_ID_LENGTH },
      },
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          // Validates attributes on create/update for this model version.
          create: spaceSettingsAttributesSchema,
          // Strips unknown attributes so older nodes can read docs written by newer ones.
          forwardCompatibility: spaceSettingsAttributesSchema.extends({}, { unknowns: 'ignore' }),
        },
      },
    },
  };
