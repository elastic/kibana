/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext, AuthTypeDef, ConnectorSpec } from '@kbn/connector-specs';
import { authTypeSpecs } from '@kbn/connector-specs/server';
import type { z } from '@kbn/zod/v4';
import { declarativeJsonSchemaToZod } from './json_schema_to_zod';
import { executeDeclarativeRequest } from './runtime';
import type { DeclarativeConnectorSpec } from './types';

const registeredAuthTypeIds = new Set(Object.values(authTypeSpecs).map(({ id }) => id));

const buildAuthTypes = (connector: DeclarativeConnectorSpec): Array<string | AuthTypeDef> => {
  return connector.auth.types.map((authType) => {
    const authTypeId = typeof authType === 'string' ? authType : authType.type;
    if (!registeredAuthTypeIds.has(authTypeId)) {
      throw new Error(
        `Declarative connector "${connector.id}" uses auth type "${authTypeId}", which is not registered in this Kibana version.`
      );
    }
    if (typeof authType === 'string') {
      return authType;
    }
    const { prefix: _prefix, ...authTypeDefinition } = authType;
    return authTypeDefinition;
  });
};

export const materializeDeclarativeConnectorSpec = (
  declarative: DeclarativeConnectorSpec,
  icon?: string
): ConnectorSpec => {
  const { icon: _iconDefinition, ...metadata } = declarative.metadata;
  const configSchema = declarativeJsonSchemaToZod(declarative.config);
  if (configSchema.type !== 'object') {
    throw new Error(`Declarative connector "${declarative.id}" config must be an object schema.`);
  }

  const actions = Object.fromEntries(
    Object.entries(declarative.actions).map(([actionId, action]) => [
      actionId,
      {
        description: action.description,
        isTool: action.isTool,
        scope: action.scope,
        input: declarativeJsonSchemaToZod(action.input),
        handler: async (context: ActionContext, input: unknown) =>
          executeDeclarativeRequest({
            context,
            connector: declarative,
            request: action.request,
            input: input as Record<string, unknown>,
          }),
      },
    ])
  ) as ConnectorSpec['actions'];

  return {
    version: declarative.version,
    metadata: {
      id: declarative.id,
      ...metadata,
      ...(icon ? { icon } : {}),
      isTechnicalPreview: true,
    },
    auth: {
      types: buildAuthTypes(declarative),
    },
    schema: configSchema as z.ZodObject,
    actions,
    test: {
      enabled: true,
      description: declarative.test.description,
      handler: async (context) =>
        executeDeclarativeRequest({
          context,
          connector: declarative,
          request: declarative.test.request,
          input: {},
        }),
    },
  };
};
