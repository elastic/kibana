/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionContext,
  ConnectorSpec,
  ConnectorTestHandlerResult,
} from '@kbn/connector-specs';
import type { z } from '@kbn/zod/v4';
import { declarativeJsonSchemaToZod } from './json_schema_to_zod';
import { executeDeclarativeRequest } from './execute_declarative_request';
import type { DeclarativeConnectorSpec } from './types';
import { DeclarativeConnectorSpecError } from './types';

const isZodObject = (schema: z.ZodType): schema is z.ZodObject =>
  'shape' in schema && typeof (schema as z.ZodObject).extend === 'function';

const defaultScopeForMethod = (method: string): 'read' | 'write' | 'destroy' => {
  if (method === 'GET') return 'read';
  if (method === 'DELETE') return 'destroy';
  return 'write';
};

/** Turns a parsed catalog contract into a ConnectorSpec with executable handlers. */
export const materializeDeclarativeConnectorSpec = (
  connector: DeclarativeConnectorSpec
): ConnectorSpec => {
  const configSchema = declarativeJsonSchemaToZod(connector.config);
  if (!isZodObject(configSchema)) {
    throw new DeclarativeConnectorSpecError(
      `Declarative connector "${connector.id}" config must be an object schema.`
    );
  }

  const actions = Object.fromEntries(
    Object.entries(connector.actions).map(([name, action]) => [
      name,
      {
        description: action.description,
        isTool: action.isTool,
        scope: action.scope ?? defaultScopeForMethod(action.request.method),
        input: declarativeJsonSchemaToZod(action.input),
        handler: async (ctx: ActionContext, input: unknown) =>
          executeDeclarativeRequest({
            client: ctx.client,
            request: action.request,
            input: (input ?? {}) as Record<string, unknown>,
            config: ctx.config,
          }),
      },
    ])
  ) as ConnectorSpec['actions'];

  return {
    metadata: {
      id: connector.id,
      displayName: connector.metadata.displayName,
      description: connector.metadata.description,
      ...(connector.metadata.docsUrl !== undefined ? { docsUrl: connector.metadata.docsUrl } : {}),
      minimumLicense: connector.metadata.minimumLicense,
      ...(connector.metadata.isTechnicalPreview !== undefined
        ? { isTechnicalPreview: connector.metadata.isTechnicalPreview }
        : {}),
      supportedFeatureIds: connector.metadata.supportedFeatureIds,
    },
    auth: {
      types: connector.auth.types,
    },
    schema: configSchema,
    actions,
    test: {
      enabled: true,
      description: connector.test.description,
      handler: async (ctx): Promise<ConnectorTestHandlerResult> =>
        (await executeDeclarativeRequest({
          client: ctx.client,
          request: connector.test.request,
          input: {},
          config: ctx.config,
        })) as ConnectorTestHandlerResult,
    },
  };
};
