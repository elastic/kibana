/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { connectorsSpecs } from '@kbn/connector-specs';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createOtherResult } from '@kbn/agent-builder-server';

const listConnectorSpecsSchema = z.object({});

const extractAuthTypes = (
  auth: { types: Array<string | { type: string }> } | undefined
): string[] => {
  if (!auth?.types) return [];
  return auth.types.map((t) => (typeof t === 'string' ? t : t.type));
};

export const listConnectorSpecsTool = (): BuiltinToolDefinition<
  typeof listConnectorSpecsSchema
> => ({
  id: platformCoreTools.listConnectorSpecs,
  type: ToolType.builtin,
  description:
    'List all available spec-based Stack Connectors that Agent Builder can integrate with. ' +
    'Returns the catalog of connectors (Slack, Google Drive, Jira, GitHub, etc.) with their ' +
    'IDs, descriptions, auth types, and action counts. Use this to discover what connectors ' +
    'exist before presenting options to the user. No parameters required.',
  schema: listConnectorSpecsSchema,
  tags: ['connector'],
  handler: async () => {
    const allSpecs = Object.values(connectorsSpecs);
    const agentBuilderSpecs = allSpecs.filter((spec) =>
      spec.metadata.supportedFeatureIds.includes('agentBuilder')
    );

    const connectors = agentBuilderSpecs.map((spec) => ({
      id: spec.metadata.id,
      displayName: spec.metadata.displayName,
      description: spec.metadata.description,
      isTechnicalPreview: spec.metadata.isTechnicalPreview ?? false,
      authTypes: extractAuthTypes(spec.auth),
      actionCount: Object.keys(spec.actions).length,
    }));

    return {
      results: [
        createOtherResult({
          connectors,
          count: connectors.length,
        }),
      ],
    };
  },
});
