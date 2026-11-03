/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { CreateConnectorTypeRequest } from '../../../../../common/routes/connector/apis/create_type';
import type {
  ActionType,
  ActionTypeConfig,
  ActionTypeParams,
  ActionTypeSecrets,
} from '../../../../types';
import type { ActionTypeRegistry } from '../../../../action_type_registry';

const fieldToZodSchema = (field: CreateConnectorTypeRequest['config'][number]) => {
  const fieldSchema =
    field.type === 'string' ? z.string() : field.type === 'number' ? z.number() : z.boolean();
  return (field.required ? fieldSchema : fieldSchema.optional()).meta({
    label: field.label?.trim() || field.name,
    ...(field.description ? { helpText: field.description } : {}),
  });
};

const appendPath = (baseUrl: string, path: string): string => {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('A request URL with a path must use HTTP or HTTPS.');
  }
  if (url.search || url.hash || url.username || url.password) {
    throw new Error('A request URL with a path cannot contain a query, fragment, or credentials.');
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}${path}`;
};

const toSpec = (request: CreateConnectorTypeRequest): ConnectorSpec => {
  const configShape = Object.fromEntries(
    request.config.map((field) => [field.name, fieldToZodSchema(field)])
  );
  const actions = Object.fromEntries(
    Object.entries(request.actions).map(([name, action]) => {
      const inputShape = Object.fromEntries(
        action.input.map((field) => [field.name, fieldToZodSchema(field)])
      );
      const inputSchema = z.object(inputShape);
      return [
        name,
        {
          description: action.description,
          scope: action.scope,
          input: inputSchema,
          handler: async (
            ctx: Parameters<ConnectorSpec['actions'][string]['handler']>[0],
            input: Record<string, unknown>
          ) => {
            const values = { config: ctx.config ?? {}, input, secrets: ctx.secrets ?? {} };
            const render = (template: string, encodePathValue = false) =>
              template.replace(
                /{{\s*(config|input|secrets)\.([A-Za-z][A-Za-z0-9_]*)\s*}}/g,
                (_match, source: keyof typeof values, key: string) => {
                  const value = values[source][key];
                  if (value === undefined || value === null) {
                    throw new Error(`Missing template value: ${source}.${key}`);
                  }
                  return encodePathValue ? encodeURIComponent(String(value)) : String(value);
                }
              );
            const headers = Object.fromEntries(
              Object.entries(action.request.headers ?? {}).map(([header, value]) => [
                header,
                render(value),
              ])
            );
            const renderBody = (value: unknown): unknown => {
              if (typeof value === 'string') return render(value);
              if (Array.isArray(value)) return value.map(renderBody);
              if (value && typeof value === 'object') {
                return Object.fromEntries(
                  Object.entries(value).map(([key, nested]) => [key, renderBody(nested)])
                );
              }
              return value;
            };
            const response = await ctx.client.request({
              method: action.request.method,
              url: action.request.path
                ? appendPath(render(action.request.url), render(action.request.path, true))
                : render(action.request.url),
              headers,
              ...(action.request.body ? { data: renderBody(action.request.body) } : {}),
            });
            return response.data;
          },
        },
      ];
    })
  );
  const auth = {
    types: [
      ...(request.auth.type === 'none'
        ? ['none']
        : [
            {
              type: request.auth.type === 'api_key_header' ? 'api_key_header' : request.auth.type,
              defaults:
                request.auth.type === 'api_key_header'
                  ? { headerField: request.auth.headerName }
                  : {},
            },
          ]),
    ],
  };

  return {
    metadata: {
      id: request.id,
      displayName: request.displayName,
      description: request.description,
      minimumLicense: 'enterprise',
      supportedFeatureIds: ['alerting', 'workflows'],
    },
    auth,
    schema: z.object(configShape),
    actions,
    test: { enabled: false, handler: async () => ({}) },
  } as ConnectorSpec;
};

export const createConnectorType = ({
  actionTypeRegistry,
  createTypeFromSpec,
  registerType,
  request,
}: {
  actionTypeRegistry: ActionTypeRegistry;
  createTypeFromSpec: (
    spec: ConnectorSpec
  ) => ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown>;
  registerType: (
    actionType: ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown>
  ) => void;
  request: CreateConnectorTypeRequest;
}): { id: string } => {
  const spec = toSpec({
    ...request,
    id: `.${request.id}`,
  });
  if (actionTypeRegistry.has(spec.metadata.id)) {
    throw Boom.conflict(`Connector type "${spec.metadata.id}" is already registered.`);
  }
  const actionType = createTypeFromSpec(spec);
  registerType(actionType);
  return { id: spec.metadata.id };
};
