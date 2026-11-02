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
import type { ConnectorTypeConversionServices } from '../../../../lib/single_file_connectors/create_connector_from_spec';
import { createConnectorTypeFromSpec } from '../../../../lib';
import type { ActionTypeRegistry } from '../../../../action_type_registry';

const fieldToZodSchema = (field: CreateConnectorTypeRequest['config'][number]) => {
  const fieldSchema =
    field.type === 'string' ? z.string() : field.type === 'number' ? z.number() : z.boolean();
  return (field.required ? fieldSchema : fieldSchema.optional()).meta({
    label: field.label?.trim() || field.name,
    ...(field.description ? { helpText: field.description } : {}),
  });
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
      const input = z.object(inputShape);
      return [
        name,
        {
          description: action.description,
          scope: action.scope,
          input,
          handler: async (
            ctx: Parameters<ConnectorSpec['actions'][string]['handler']>[0],
            params: Record<string, unknown>
          ) => {
            const values = { config: ctx.config ?? {}, params, secrets: ctx.secrets ?? {} };
            const render = (template: string) =>
              template.replace(
                /{{\s*(config|params|secrets)\.([A-Za-z][A-Za-z0-9_]*)\s*}}/g,
                (_match, source: keyof typeof values, key: string) => {
                  const value = values[source][key];
                  if (value === undefined || value === null) {
                    throw new Error(`Missing template value: ${source}.${key}`);
                  }
                  return String(value);
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
              url: render(action.request.url),
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
      supportedFeatureIds: ['alerting'],
    },
    auth,
    schema: z.object(configShape),
    actions,
    test: { enabled: false, handler: async () => ({}) },
  } as ConnectorSpec;
};

export const createConnectorType = ({
  actionTypeRegistry,
  conversionServices,
  registerType,
  request,
}: {
  actionTypeRegistry: ActionTypeRegistry;
  conversionServices: ConnectorTypeConversionServices;
  registerType: (
    actionType: ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown>
  ) => void;
  request: CreateConnectorTypeRequest;
}): { id: string } => {
  const spec = toSpec(request);
  if (actionTypeRegistry.has(spec.metadata.id)) {
    throw Boom.conflict(`Connector type "${spec.metadata.id}" is already registered.`);
  }
  const actionType = createConnectorTypeFromSpec(spec, conversionServices);
  registerType(actionType);
  return { id: spec.metadata.id };
};
