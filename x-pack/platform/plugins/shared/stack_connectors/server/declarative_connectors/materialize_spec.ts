/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionContext, AuthTypeDef, ConnectorSpec } from '@kbn/connector-specs';
import type { z } from '@kbn/zod/v4';
import { declarativeJsonSchemaToZod } from './json_schema_to_zod';
import { executeDeclarativeRequest } from './runtime';
import type { DeclarativeConnectorSpec } from './types';

const buildAuthTypes = (connector: DeclarativeConnectorSpec): Array<string | AuthTypeDef> => {
  const { auth } = connector;
  if (auth.type !== 'api_key_header') return [auth.type];
  if (!auth.header) {
    throw new Error(`Declarative connector "${connector.id}" requires an auth header.`);
  }
  return [
    {
      type: 'api_key_header',
      defaults: { headerField: auth.header },
      overrides: {
        meta: {
          [auth.header]: {
            ...(auth.label ? { label: auth.label } : {}),
            ...(auth.placeholder ? { placeholder: auth.placeholder } : {}),
          },
        },
      },
    },
  ];
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
