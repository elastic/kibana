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
  ConnectorTypeAuthType,
  ConnectorTypeField,
  ConnectorTypeRequestForm,
  ConnectorTypeTestForm,
} from '../types';
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

const createEmptyRequest = (
  method: ConnectorTypeRequestForm['method']
): ConnectorTypeRequestForm => ({
  method,
  url: '',
  path: '',
  headers: [],
  body: '',
});

export const createEmptyAction = (): ConnectorTypeActionForm => ({
  name: '',
  description: '',
  scope: 'write',
  input: [],
  request: createEmptyRequest('POST'),
});

export const createEmptyTest = (): ConnectorTypeTestForm => ({
  description: '',
  request: createEmptyRequest('GET'),
});

/** A blank form with the one action the form shows by default. */
export const getEmptyFormData = (): BuildConnectorFormData => ({
  id: '',
  displayName: '',
  description: '',
  icon: '',
  logoUrl: '',
  auth: { types: ['none'] },
  config: [],
  actions: [createEmptyAction()],
  test: createEmptyTest(),
});

const toRequestField = (field: ConnectorTypeField): ConnectorTypeField => ({
  name: field.name,
  type: field.type,
  required: field.required ?? false,
  default: field.default,
  items: field.items,
  format: field.format,
  label: field.label,
  description: field.description,
});

const toRequestAuth = ({
  types,
  headerName,
}: BuildConnectorFormData['auth']): CreateConnectorTypeRequest['auth'] => {
  if (types.length === 1) {
    const [type] = types;
    return type === 'api_key_header' ? { type, headerName: headerName ?? '' } : { type };
  }
  return {
    types: types.map((type) =>
      type === 'api_key_header' ? { type, defaults: { headerField: headerName ?? '' } } : type
    ),
  };
};

const toRequest = (request: ConnectorTypeRequestForm): ConnectorTypeAction['request'] => {
  const { method, url, path, headers, body } = request;
  // Invalid JSON is reported by the form resolver; the schema only sees parsed bodies.
  const { value: parsedBody } = parseJsonObject(body);

  return {
    method,
    url,
    path: path || undefined,
    body: parsedBody,
    ...(headers.length > 0
      ? { headers: Object.fromEntries(headers.map((header) => [header.key, header.value])) }
      : {}),
  };
};

const toRequestAction = (action: ConnectorTypeActionForm): ConnectorTypeAction => ({
  description: action.description,
  scope: action.scope,
  input: action.input.map(toRequestField),
  request: toRequest(action.request),
});

/** The test is optional: it is sent only once the user has filled something in. */
const isTestDefined = ({ description, request }: ConnectorTypeTestForm): boolean =>
  Boolean(
    description.trim() ||
      request.url.trim() ||
      request.path.trim() ||
      request.headers.length > 0 ||
      request.body.trim()
  );

const toRequestTest = ({
  description,
  request,
}: ConnectorTypeTestForm): NonNullable<CreateConnectorTypeRequest['test']> => ({
  description: description || undefined,
  request: toRequest(request),
});

/** Turns the form state into the POST /api/actions/connector_types body. */
export const formDataToRequest = (
  formData: BuildConnectorFormData
): CreateConnectorTypeRequest => ({
  id: formData.id,
  displayName: formData.displayName,
  description: formData.description,
  ...(formData.icon ? { icon: formData.icon } : {}),
  config: formData.config.map(toRequestField),
  auth: toRequestAuth(formData.auth),
  actions: Object.fromEntries(
    formData.actions.map((action) => [action.name, toRequestAction(action)])
  ),
  ...(isTestDefined(formData.test) ? { test: toRequestTest(formData.test) } : {}),
});

const toFormRequest = (
  request: Partial<ConnectorTypeAction['request']> | undefined,
  method: ConnectorTypeRequestForm['method']
): ConnectorTypeRequestForm => {
  const empty = createEmptyRequest(method);
  return {
    method: request?.method ?? empty.method,
    url: request?.url ?? empty.url,
    path: request?.path ?? empty.path,
    headers: Object.entries(request?.headers ?? {}).map(([key, value]) => ({ key, value })),
    body: request?.body ? JSON.stringify(request.body, null, 2) : '',
  };
};

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
    request: toFormRequest(action.request, empty.request.method),
  };
};

const toFormAuth = (
  auth: Partial<CreateConnectorTypeRequest>['auth']
): BuildConnectorFormData['auth'] => {
  if (!auth) {
    return { types: ['none'] };
  }
  if ('type' in auth) {
    return auth.type === 'api_key_header'
      ? { types: [auth.type], headerName: auth.headerName }
      : { types: [auth.type] };
  }

  const types: ConnectorTypeAuthType[] = auth.types.map((entry) =>
    typeof entry === 'string' ? entry : entry.type
  );
  const apiKeyEntry = auth.types.find(
    (entry): entry is Extract<typeof entry, { type: 'api_key_header' }> =>
      typeof entry !== 'string' && entry.type === 'api_key_header'
  );
  return apiKeyEntry ? { types, headerName: apiKeyEntry.defaults.headerField } : { types };
};

/** Turns a (possibly partial) request body, e.g. parsed from YAML, into form state. */
export const requestToFormData = (
  request: Partial<CreateConnectorTypeRequest>
): BuildConnectorFormData => ({
  id: normalizeConnectorTypeId(request.id),
  displayName: request.displayName ?? '',
  description: request.description ?? '',
  icon: request.icon ?? '',
  logoUrl: '',
  auth: toFormAuth(request.auth),
  config: request.config ?? [],
  actions: Object.entries(request.actions ?? {}).map(([name, action]) =>
    toFormAction(name, action)
  ),
  test: request.test
    ? {
        description: request.test.description ?? '',
        request: toFormRequest(request.test.request, 'GET'),
      }
    : createEmptyTest(),
});
