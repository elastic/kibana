/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import { getSchemaForAuthType } from '@kbn/connector-specs/src/lib';
import type { AuthTypeDef } from '@kbn/connector-specs';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createOtherResult, createErrorResult } from '@kbn/agent-builder-server';

const getConnectorSchemaInputSchema = z.object({
  connector_type_id: z
    .string()
    .min(1)
    .describe(
      'The connector spec ID (e.g. ".slack2", ".jira-cloud", ".google_drive"). ' +
        'Use list_connector_specs first to discover available IDs.'
    ),
});

const serializeZodSchema = (schema: z.ZodObject | undefined): Record<string, unknown> | null => {
  if (!schema) return null;
  try {
    return z.toJSONSchema(schema, {
      unrepresentable: 'any',
      reused: 'ref',
    }) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const serializeAuthTypes = (
  authDefs: Array<string | AuthTypeDef> | undefined
): Array<{ id: string; schema: Record<string, unknown> | null }> => {
  if (!authDefs) return [];

  return authDefs.map((def) => {
    try {
      const resolved = getSchemaForAuthType(def);
      return {
        id: resolved.id,
        schema: serializeZodSchema(resolved.schema),
      };
    } catch {
      const id = typeof def === 'string' ? def : def.type;
      return { id, schema: null };
    }
  });
};

export const getConnectorSchemaTool = (): BuiltinToolDefinition<
  typeof getConnectorSchemaInputSchema
> => ({
  id: platformCoreTools.getConnectorSchema,
  type: ToolType.builtin,
  description:
    'Get the detailed configuration schema for a specific connector type. ' +
    'Returns the JSON Schema (with UI metadata like labels, help text, placeholders, and sensitivity flags) ' +
    'needed to generate an accurate configuration form. Also returns auth type schemas with their ' +
    'specific fields (e.g. bearer has a token field, OAuth has clientId/clientSecret). ' +
    'Call list_connector_specs first to get the connector type ID.',
  schema: getConnectorSchemaInputSchema,
  tags: ['connector'],
  handler: async ({ connector_type_id: connectorTypeId }) => {
    const spec = getConnectorSpec(connectorTypeId);

    if (!spec) {
      return {
        results: [
          createErrorResult(
            `No connector spec found for type '${connectorTypeId}'. ` +
              'Use list_connector_specs to discover available connector type IDs.'
          ),
        ],
      };
    }

    const { metadata, auth, actions, skill } = spec;

    const actionSummaries = Object.entries(actions).map(([name, action]) => ({
      name,
      description: action.description ?? '',
      isTool: isToolAction(spec, name),
    }));

    const configSchema = serializeZodSchema(spec.schema);
    const authTypes = serializeAuthTypes(auth?.types);

    return {
      results: [
        createOtherResult({
          id: metadata.id,
          displayName: metadata.displayName,
          description: metadata.description,
          isTechnicalPreview: metadata.isTechnicalPreview ?? false,
          authTypes,
          configSchema,
          actions: actionSummaries,
          ...(skill ? { skill } : {}),
        }),
      ],
    };
  },
});
