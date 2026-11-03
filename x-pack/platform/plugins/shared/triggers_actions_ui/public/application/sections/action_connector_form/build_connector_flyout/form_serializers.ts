/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSlugIdentifier } from '@kbn/std';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { CONNECTOR_TYPE_ID_MAX_LENGTH } from '@kbn/actions-plugin/common';
import type {
  BuildConnectorFormData,
  ConnectorTypeAction,
  ConnectorTypeActionForm,
  ConnectorTypeField,
} from './types';
import { parseJsonObject } from './json_body';

/** Derives a connector type ID from its display name, e.g. 'My Service' → 'my-service'. */
export const toConnectorTypeId = (displayName: string): string => {
  const slug = toSlugIdentifier(displayName.slice(0, CONNECTOR_TYPE_ID_MAX_LENGTH));
  return slug.slice(0, CONNECTOR_TYPE_ID_MAX_LENGTH);
};

const normalizeConnectorTypeId = (id: string | undefined): string => {
  if (!id) return '';
  if (!id.startsWith('.')) return id;
  const bareId = id.slice(1);
  const isValidBareId =
    bareId.length <= CONNECTOR_TYPE_ID_MAX_LENGTH && /^[a-z0-9_-]+$/.test(bareId);
  return isValidBareId ? bareId : id;
};

export const createEmptyAction = (): ConnectorTypeActionForm => ({
  name: '',
  description: '',
  scope: 'write',
  input: [],
  request: { method: 'POST', url: '', path: '', headers: [], body: '' },
});

/** A blank form with the one action the form shows by default. */
export const getEmptyFormData = (): BuildConnectorFormData => ({
  id: '',
  displayName: '',
  description: '',
  auth: { type: 'none' },
  config: [],
  actions: [createEmptyAction()],
});

const toRequestField = (field: ConnectorTypeField): ConnectorTypeField => ({
  name: field.name,
  type: field.type,
  required: field.required ?? false,
  ...(field.default !== undefined ? { default: field.default } : {}),
  ...(field.type === 'array' && field.items ? { items: field.items } : {}),
  ...(field.type === 'string' && field.format ? { format: field.format } : {}),
  ...(field.label ? { label: field.label } : {}),
  ...(field.description ? { description: field.description } : {}),
});

const toRequestAuth = (
  auth: BuildConnectorFormData['auth']
): CreateConnectorTypeRequest['auth'] => {
  switch (auth.type) {
    case 'api_key_header':
      return { type: 'api_key_header', headerName: auth.headerName ?? '' };
    case 'basic':
      return { type: 'basic' };
    case 'bearer':
      return { type: 'bearer' };
    default:
      return { type: 'none' };
  }
};

const toRequestAction = (action: ConnectorTypeActionForm): ConnectorTypeAction => {
  const { path, headers, body } = action.request;
  // Invalid JSON is reported by the form resolver; the schema only sees parsed bodies.
  const { value: parsedBody } = parseJsonObject(body);

  return {
    description: action.description,
    scope: action.scope,
    input: action.input.map(toRequestField),
    request: {
      method: action.request.method,
      url: action.request.url,
      ...(path ? { path } : {}),
      ...(headers.length > 0
        ? { headers: Object.fromEntries(headers.map(({ key, value }) => [key, value])) }
        : {}),
      ...(parsedBody ? { body: parsedBody } : {}),
    },
  };
};

/** Turns the form state into the POST /api/actions/connector_types body. */
export const formDataToRequest = (
  formData: BuildConnectorFormData
): CreateConnectorTypeRequest => ({
  id: formData.id,
  displayName: formData.displayName,
  description: formData.description,
  config: formData.config.map(toRequestField),
  auth: toRequestAuth(formData.auth),
  actions: Object.fromEntries(
    formData.actions.map((action) => [action.name, toRequestAction(action)])
  ),
});

const toFormAction = (
  name: string,
  action: Partial<ConnectorTypeAction>
): ConnectorTypeActionForm => {
  const empty = createEmptyAction();
  return {
    name,
    description: action.description ?? empty.description,
    scope: action.scope ?? empty.scope,
    input: action.input ?? empty.input,
    request: {
      method: action.request?.method ?? empty.request.method,
      url: action.request?.url ?? empty.request.url,
      path: action.request?.path ?? empty.request.path,
      headers: Object.entries(action.request?.headers ?? {}).map(([key, value]) => ({
        key,
        value,
      })),
      body: action.request?.body ? JSON.stringify(action.request.body, null, 2) : '',
    },
  };
};

/** Turns a (possibly partial) request body, e.g. parsed from YAML, into form state. */
export const requestToFormData = (
  request: Partial<CreateConnectorTypeRequest>
): BuildConnectorFormData => ({
  id: normalizeConnectorTypeId(request.id),
  displayName: request.displayName ?? '',
  description: request.description ?? '',
  auth:
    request.auth && 'type' in request.auth && request.auth.type === 'api_key_header'
      ? { type: 'api_key_header', headerName: request.auth.headerName }
      : {
          type: request.auth && 'type' in request.auth ? request.auth.type : ('none' as const),
        },
  config: request.config ?? [],
  actions: Object.entries(request.actions ?? {}).map(([name, action]) =>
    toFormAction(name, action)
  ),
});
