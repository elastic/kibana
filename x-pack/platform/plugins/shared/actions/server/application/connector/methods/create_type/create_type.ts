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
  const scalar = (type: 'string' | 'number' | 'boolean') => {
    if (type === 'number') return z.number();
    if (type === 'boolean') return z.boolean();
    if (field.format === 'uri') return z.url();
    if (field.format === 'ipv4') return z.ipv4();
    if (field.format === 'date-time') return z.iso.datetime();
    return z.string();
  };
  const fieldSchema: z.ZodType<string | number | boolean | Array<string | number | boolean>> =
    field.type === 'array' ? z.array(scalar(field.items ?? 'string')).max(100) : scalar(field.type);
  const optionalSchema = field.required ? fieldSchema : fieldSchema.optional();
  const schemaWithDefault =
    field.default === undefined ? optionalSchema : optionalSchema.default(field.default);
  return schemaWithDefault.meta({
    label: field.label?.trim() || field.name,
    ...(field.description ? { helpText: field.description } : {}),
  });
};

const executeRequest = async (
  ctx: Parameters<ConnectorSpec['actions'][string]['handler']>[0],
  request: CreateConnectorTypeRequest['actions'][string]['request'],
  input: Record<string, unknown>
) => {
  const values = { config: ctx.config ?? {}, input, secrets: ctx.secrets ?? {} };
  const resolveValue = (source: keyof typeof values, key: string) => {
    const value = values[source][key];
    if (value === undefined || value === null) {
      throw new Error(`Missing template value: ${source}.${key}`);
    }
    return value;
  };
  const render = (template: string, encodePathValue = false) =>
    template.replace(
      /{{\s*(config|input|secrets)\.([A-Za-z][A-Za-z0-9_]*)\s*}}/g,
      (_match, source: keyof typeof values, key: string) => {
        const value = resolveValue(source, key);
        return encodePathValue ? encodeURIComponent(String(value)) : String(value);
      }
    );
  const renderBody = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const wholeValuePlaceholder = value.match(
        /^{{\s*(config|input|secrets)\.([A-Za-z][A-Za-z0-9_]*)\s*}}$/
      );
      if (wholeValuePlaceholder) {
        const [, source, key] = wholeValuePlaceholder;
        return resolveValue(source as keyof typeof values, key);
      }
      return render(value);
    }
    if (Array.isArray(value)) return value.map(renderBody);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, renderBody(nested)])
      );
    return value;
  };
  const response = await ctx.client.request({
    method: request.method,
    url: request.path
      ? appendPath(render(request.url), render(request.path, true))
      : render(request.url),
    headers: Object.fromEntries(
      Object.entries(request.headers ?? {}).map(([header, value]) => [header, render(value)])
    ),
    ...(request.body ? { data: renderBody(request.body) } : {}),
  });
  return response.data;
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
          ) => executeRequest(ctx, action.request, input),
        },
      ];
    })
  );
  const authTypes = 'types' in request.auth ? request.auth.types : [request.auth];
  const auth = {
    types: authTypes.map((authType) => {
      const type = typeof authType === 'string' ? authType : authType.type;
      if (typeof authType === 'string') return authType;
      if (type === 'api_key_header') {
        return 'headerName' in authType
          ? { type, defaults: { headerField: authType.headerName } }
          : authType;
      }
      return type;
    }),
  };
  const test = request.test;

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
    test: test
      ? {
          enabled: true,
          description: test.description,
          handler: async (ctx: Parameters<ConnectorSpec['actions'][string]['handler']>[0]) => {
            await executeRequest(ctx, test.request, {});
            return {};
          },
        }
      : { enabled: false, handler: async () => ({}) },
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
