/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { parse, stringify } from 'yaml';
import { i18n } from '@kbn/i18n';
import { createConnectorTypeRequestSchema } from '@kbn/actions-plugin/common';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { toConnectorTypeId } from './form_serializers';

const MAX_SPEC_CHARS = 1_000_000;
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
type Method = (typeof METHODS)[number];
type Field = CreateConnectorTypeRequest['config'][number];
type Action = CreateConnectorTypeRequest['actions'][string];
type Auth = CreateConnectorTypeRequest['auth'];

export interface OpenApiImportResult {
  connectorType: CreateConnectorTypeRequest;
  skippedOperations: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isReference = (value: unknown): value is OpenAPIV3.ReferenceObject =>
  isObject(value) && typeof value.$ref === 'string';

const resolve = <T>(document: OpenAPIV3.Document, value: T | OpenAPIV3.ReferenceObject): T => {
  let current: unknown = value;
  const visited = new Set<string>();
  while (isReference(current)) {
    const reference = current.$ref;
    if (!reference.startsWith('#/') || visited.has(reference) || visited.size >= 8) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiReferenceErrorMessage',
          {
            defaultMessage: 'Unsupported or circular reference: {reference}',
            values: { reference },
          }
        )
      );
    }
    visited.add(reference);
    current = reference
      .slice(2)
      .split('/')
      .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
      .reduce<unknown>((node, part) => (isObject(node) ? node[part] : undefined), document);
    if (current === undefined)
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiMissingReferenceErrorMessage',
          {
            defaultMessage: 'Reference not found: {reference}',
            values: { reference },
          }
        )
      );
  }
  return current as T;
};

const toIdentifier = (value: string, fallback: string, maxLength = 64): string => {
  const normalized = value
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const prefixed = /^[A-Za-z]/.test(normalized) ? normalized : `${fallback}_${normalized}`;
  const identifier = (prefixed || fallback).slice(0, maxLength);
  return ['__proto__', 'constructor', 'prototype'].includes(identifier)
    ? `${fallback}_${identifier}`.slice(0, maxLength)
    : identifier;
};

const toField = (
  document: OpenAPIV3.Document,
  name: string,
  schemaOrReference: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  required: boolean
): Field => {
  const schema = resolve<OpenAPIV3.SchemaObject>(document, schemaOrReference);
  const fieldName = toIdentifier(name, 'field');
  const common = {
    name: fieldName,
    required,
    label: name.slice(0, 512),
    ...(schema.description ? { description: schema.description.slice(0, 1000) } : {}),
  };
  if (schema.type === 'array') {
    if (!schema.items)
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiMissingArrayItemsErrorMessage',
          {
            defaultMessage: 'Array parameter "{name}" has no item type.',
            values: { name },
          }
        )
      );
    const items = resolve<OpenAPIV3.SchemaObject>(document, schema.items);
    const itemType = items.type === 'integer' ? 'number' : items.type;
    if (itemType !== 'string' && itemType !== 'number' && itemType !== 'boolean') {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiArrayItemsErrorMessage',
          {
            defaultMessage: 'Array parameter "{name}" has an unsupported item type.',
            values: { name },
          }
        )
      );
    }
    return { ...common, type: 'array', items: itemType };
  }
  const type = schema.type === 'integer' ? 'number' : schema.type;
  if (type !== 'string' && type !== 'number' && type !== 'boolean') {
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiParameterTypeErrorMessage',
        {
          defaultMessage: 'Parameter "{name}" has an unsupported type.',
          values: { name },
        }
      )
    );
  }
  const format =
    type === 'string' &&
    (schema.format === 'uri' || schema.format === 'ipv4' || schema.format === 'date-time')
      ? schema.format
      : undefined;
  return { ...common, type, ...(format ? { format } : {}) };
};

const getAuth = (
  document: OpenAPIV3.Document,
  security: OpenAPIV3.SecurityRequirementObject[]
): Auth => {
  if (security.length === 0) return { type: 'none' };
  if (security.length !== 1 || Object.keys(security[0]).length !== 1) {
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiMultipleSecurityErrorMessage',
        {
          defaultMessage: 'Only one security scheme per operation is supported.',
        }
      )
    );
  }
  const schemeName = Object.keys(security[0])[0];
  const schemeOrReference = document.components?.securitySchemes?.[schemeName];
  if (!schemeOrReference)
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiMissingSecurityErrorMessage',
        {
          defaultMessage: 'Security scheme not found: {schemeName}',
          values: { schemeName },
        }
      )
    );
  const scheme = resolve<OpenAPIV3.SecuritySchemeObject>(document, schemeOrReference);
  if (scheme.type === 'http' && scheme.scheme === 'basic') return { type: 'basic' };
  if (scheme.type === 'http' && scheme.scheme === 'bearer') return { type: 'bearer' };
  if (scheme.type === 'apiKey' && scheme.in === 'header' && scheme.name) {
    return { type: 'api_key_header', headerName: scheme.name };
  }
  throw new Error(
    i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.openApiSecurityErrorMessage',
      {
        defaultMessage: 'Unsupported security scheme: {schemeName}',
        values: { schemeName },
      }
    )
  );
};

const buildAction = (
  document: OpenAPIV3.Document,
  path: string,
  method: Method,
  pathItem: OpenAPIV3.PathItemObject,
  operation: OpenAPIV3.OperationObject
): Action => {
  const parameters = Array.from(
    new Map(
      [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])].map((entry) => {
        const parameter = resolve<OpenAPIV3.ParameterObject>(document, entry);
        return [`${parameter.in}:${parameter.name}`, parameter] as const;
      })
    ).values()
  );
  const input: Field[] = [];
  const pathNames = new Set<string>();
  const headers: Record<string, string> = {};
  const query: string[] = [];
  for (const parameter of parameters) {
    if (!parameter.schema)
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiMissingParameterSchemaErrorMessage',
          {
            defaultMessage: 'Parameter "{name}" has no schema.',
            values: { name: parameter.name },
          }
        )
      );
    if (parameter.in !== 'path' && parameter.in !== 'header' && parameter.in !== 'query') {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiParameterLocationErrorMessage',
          {
            defaultMessage: 'Unsupported parameter location: {location}',
            values: { location: parameter.in },
          }
        )
      );
    }
    if (!parameter.required) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiOptionalParameterErrorMessage',
          {
            defaultMessage: 'Optional {location} parameter "{name}" is not supported.',
            values: { location: parameter.in, name: parameter.name },
          }
        )
      );
    }
    if (
      (parameter.in === 'path' || parameter.in === 'header') &&
      parameter.style &&
      parameter.style !== 'simple'
    ) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiParameterEncodingErrorMessage',
          {
            defaultMessage: 'Parameter "{name}" needs an unsupported encoding.',
            values: { name: parameter.name },
          }
        )
      );
    }
    const field = toField(document, parameter.name, parameter.schema, parameter.required ?? false);
    if (input.some(({ name }) => name === field.name)) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiDuplicateParameterErrorMessage',
          {
            defaultMessage: 'Duplicate parameter name: {name}',
            values: { name: field.name },
          }
        )
      );
    }
    input.push(field);
    if (parameter.in === 'path') pathNames.add(parameter.name);
    if (parameter.in === 'header') {
      if (!/^[A-Za-z0-9-]+$/.test(parameter.name)) {
        throw new Error(
          i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.openApiHeaderNameErrorMessage',
            {
              defaultMessage: 'Header parameter "{name}" has an invalid name.',
              values: { name: parameter.name },
            }
          )
        );
      }
      headers[parameter.name] = `{{input.${field.name}}}`;
    }
    if (parameter.in === 'query') {
      if (
        field.type === 'array' ||
        parameter.allowReserved ||
        (parameter.style && parameter.style !== 'form')
      ) {
        throw new Error(
          i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.openApiQueryEncodingErrorMessage',
            {
              defaultMessage: 'Query parameter "{name}" needs an unsupported encoding.',
              values: { name: parameter.name },
            }
          )
        );
      }
      query.push(`${encodeURIComponent(parameter.name)}={{input.${field.name}}}`);
    }
  }

  let body: Action['request']['body'];
  if (operation.requestBody) {
    const requestBody = resolve<OpenAPIV3.RequestBodyObject>(document, operation.requestBody);
    const media = requestBody.content['application/json'];
    if (!media?.schema)
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiJsonBodyOnlyErrorMessage',
          {
            defaultMessage: 'Only JSON request bodies are supported.',
          }
        )
      );
    const schema = resolve<OpenAPIV3.SchemaObject>(document, media.schema);
    if (schema.type !== 'object' || !schema.properties) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiBodyShapeErrorMessage',
          {
            defaultMessage: 'The JSON request body must be an object with scalar properties.',
          }
        )
      );
    }
    body = {};
    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      if (['__proto__', 'constructor', 'prototype'].includes(propertyName)) {
        throw new Error(
          i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.openApiReservedPropertyErrorMessage',
            {
              defaultMessage: 'JSON property "{name}" has a reserved name.',
              values: { name: propertyName },
            }
          )
        );
      }
      if (!requestBody.required || !schema.required?.includes(propertyName)) {
        throw new Error(
          i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.openApiOptionalPropertyErrorMessage',
            {
              defaultMessage: 'Optional JSON property "{name}" is not supported.',
              values: { name: propertyName },
            }
          )
        );
      }
      const field = toField(document, propertyName, propertySchema, true);
      if (input.some(({ name }) => name === field.name)) {
        throw new Error(
          i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.openApiDuplicateParameterErrorMessage',
            {
              defaultMessage: 'Duplicate parameter name: {name}',
              values: { name: field.name },
            }
          )
        );
      }
      input.push(field);
      body[propertyName] = `{{input.${field.name}}}`;
    }
    headers['Content-Type'] = 'application/json';
  }

  if (input.length > 50)
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiTooManyInputsErrorMessage',
        {
          defaultMessage: 'An action cannot have more than 50 input fields.',
        }
      )
    );
  const renderedPath = path.replace(/\{([^{}]+)\}/g, (_match, name: string) => {
    if (!pathNames.has(name))
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiUndeclaredPathErrorMessage',
          {
            defaultMessage: 'Path parameter "{name}" is not declared.',
            values: { name },
          }
        )
      );
    return `{{input.${toIdentifier(name, 'field')}}}`;
  });
  if (!renderedPath.startsWith('/') || renderedPath.startsWith('//')) {
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiPathErrorMessage',
        {
          defaultMessage: 'Operation path must start with one slash.',
        }
      )
    );
  }
  const request: Action['request'] = {
    method: method.toUpperCase() as Action['request']['method'],
    url: query.length
      ? `{{config.baseUrl}}${renderedPath}?${query.join('&')}`
      : '{{config.baseUrl}}',
    ...(query.length ? {} : { path: renderedPath }),
    ...(Object.keys(headers).length ? { headers } : {}),
    ...(body ? { body } : {}),
  };
  return {
    description: (
      operation.summary ??
      operation.description ??
      `${method.toUpperCase()} ${path}`
    ).slice(0, 1000),
    scope: method === 'get' ? 'read' : method === 'delete' ? 'destroy' : 'write',
    input,
    request,
  };
};

/** Converts supported OpenAPI 3 operations into a draft for the connector type form. */
export const parseOpenApi = (text: string): OpenApiImportResult => {
  if (text.length > MAX_SPEC_CHARS)
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiTooLargeErrorMessage',
        {
          defaultMessage: 'OpenAPI document must be at most 1 MB.',
        }
      )
    );
  const parsed: unknown = parse(text);
  if (
    !isObject(parsed) ||
    typeof parsed.openapi !== 'string' ||
    !/^3\.[01]\./.test(parsed.openapi) ||
    !isObject(parsed.info) ||
    typeof parsed.info.title !== 'string' ||
    typeof parsed.info.version !== 'string' ||
    !isObject(parsed.paths)
  ) {
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiDocumentErrorMessage',
        {
          defaultMessage: 'Enter an OpenAPI 3.0 or 3.1 document with info, version, and paths.',
        }
      )
    );
  }
  const document = parsed as unknown as OpenAPIV3.Document;
  const server = document.servers?.[0];
  if (typeof server?.url !== 'string' || !server.url || server.url.includes('{')) {
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiServerVariablesErrorMessage',
        {
          defaultMessage:
            'The first server must have an absolute HTTP or HTTPS URL without variables.',
        }
      )
    );
  }
  let baseUrl: URL;
  try {
    baseUrl = new URL(server.url);
  } catch {
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiServerUrlErrorMessage',
        {
          defaultMessage: 'The first server must have an absolute HTTP or HTTPS URL.',
        }
      )
    );
  }
  if (
    !['http:', 'https:'].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiServerUrlFormatErrorMessage',
        {
          defaultMessage: 'The first server must have a plain HTTP or HTTPS URL.',
        }
      )
    );
  }

  const auth = getAuth(document, document.security ?? []);
  const actions: CreateConnectorTypeRequest['actions'] = {};
  const skippedOperations: string[] = [];
  for (const [path, pathItemOrReference] of Object.entries(document.paths)) {
    if (!pathItemOrReference) continue;
    const pathItem = resolve<OpenAPIV3.PathItemObject>(document, pathItemOrReference);
    for (const unsupportedMethod of ['head', 'options', 'trace'] as const) {
      if (pathItem[unsupportedMethod]) {
        skippedOperations.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.openApiUnsupportedMethodErrorMessage',
            {
              defaultMessage: '{method} {path}: HTTP method is not supported.',
              values: { method: unsupportedMethod.toUpperCase(), path },
            }
          )
        );
      }
    }
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (!operation || operation.deprecated) continue;
      const label = `${method.toUpperCase()} ${path}`;
      try {
        if (pathItem.servers?.length || operation.servers?.length) {
          throw new Error(
            i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.openApiOperationServerErrorMessage',
              {
                defaultMessage: 'Operation and path server overrides are not supported.',
              }
            )
          );
        }
        if (Object.keys(actions).length >= 100) {
          throw new Error(
            i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.openApiTooManyActionsErrorMessage',
              {
                defaultMessage: 'The connector type supports at most 100 actions.',
              }
            )
          );
        }
        const operationAuth = getAuth(document, operation.security ?? document.security ?? []);
        if (JSON.stringify(operationAuth) !== JSON.stringify(auth)) {
          throw new Error(
            i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.openApiOperationSecurityErrorMessage',
              {
                defaultMessage: 'Operation security differs from the document security.',
              }
            )
          );
        }
        const baseName = toIdentifier(operation.operationId ?? `${method}_${path}`, 'action');
        let actionName = baseName;
        for (let suffix = 2; Object.hasOwn(actions, actionName); suffix++) {
          actionName = `${baseName.slice(0, 64 - String(suffix).length - 1)}_${suffix}`;
        }
        actions[actionName] = buildAction(document, path, method, pathItem, operation);
      } catch (error) {
        skippedOperations.push(
          `${label}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
  if (Object.keys(actions).length === 0) {
    throw new Error(
      skippedOperations[0] ??
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiNoOperationsErrorMessage',
          {
            defaultMessage: 'No supported GET, POST, PUT, PATCH, or DELETE operations were found.',
          }
        )
    );
  }
  const displayName = document.info.title.trim().slice(0, 512);
  const connectorType: CreateConnectorTypeRequest = {
    id: toConnectorTypeId(displayName),
    displayName,
    description:
      typeof document.info.description === 'string' ? document.info.description.slice(0, 1000) : '',
    config: [
      {
        name: 'baseUrl',
        type: 'string',
        format: 'uri',
        required: true,
        default: baseUrl.toString().replace(/\/$/, ''),
        label: 'Base URL',
      },
    ],
    auth,
    actions,
  };
  const validated = createConnectorTypeRequestSchema.safeParse(connectorType);
  if (!validated.success) {
    const issue = validated.error.issues[0];
    throw new Error(
      i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.openApiDraftValidationErrorMessage',
        {
          defaultMessage: 'Imported draft is invalid at {path}: {message}',
          values: { path: issue.path.join('.'), message: issue.message },
        }
      )
    );
  }
  return { connectorType: validated.data, skippedOperations };
};

/** Formats an OpenAPI document in YAML without changing its meaning. */
export const formatOpenApi = (text: string): string => stringify(parse(text), { indent: 2 });
