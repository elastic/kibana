/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'yaml';
import { i18n } from '@kbn/i18n';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const listOfFieldsError = (path: string) =>
  new Error(
    i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.yamlListOfFieldsError', {
      defaultMessage:
        '"{path}" must be a list of fields, each with a name and a type (and optionally required, label and description).',
      values: { path },
    })
  );

const mapError = (path: string, keyedBy: string) =>
  new Error(
    i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.yamlMapError', {
      defaultMessage: '"{path}" must be a map keyed by {keyedBy}.',
      values: { path, keyedBy },
    })
  );

const objectError = (path: string) =>
  new Error(
    i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.yamlObjectError', {
      defaultMessage: '"{path}" must be an object.',
      values: { path },
    })
  );

const unknownKeyError = (path: string, key: string, allowed: readonly string[]) =>
  new Error(
    path
      ? i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.yamlUnknownKeyError',
          {
            defaultMessage: '"{path}" has an unknown key "{key}". Allowed keys: {allowed}.',
            values: { path, key, allowed: allowed.join(', ') },
          }
        )
      : i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.yamlUnknownTopLevelKeyError',
          {
            defaultMessage: 'Unknown top-level key "{key}". Allowed keys: {allowed}.',
            values: { key, allowed: allowed.join(', ') },
          }
        )
  );

const DEFINITION_KEYS = ['id', 'displayName', 'description', 'auth', 'config', 'actions'] as const;
const AUTH_KEYS = ['type', 'headerName'] as const;
const FIELD_KEYS = ['name', 'type', 'required', 'label', 'description'] as const;
const ACTION_KEYS = ['description', 'scope', 'input', 'request'] as const;
const REQUEST_KEYS = ['method', 'url', 'path', 'headers', 'body'] as const;

const assertKnownKeys = (
  value: Record<string, unknown>,
  path: string,
  allowed: readonly string[]
) => {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown !== undefined) {
    throw unknownKeyError(path, unknown, allowed);
  }
};

const assertFieldList = (value: unknown, path: string) => {
  if (value === undefined) {
    return;
  }
  if (!(Array.isArray(value) && value.every(isPlainObject))) {
    throw listOfFieldsError(path);
  }
  value.forEach((field, index) => assertKnownKeys(field, `${path}[${index}]`, FIELD_KEYS));
};

/**
 * Checks the parts of the definition the form relies on to render it: known keys (the API is
 * strict, and an unknown key would otherwise be dropped silently) and lists vs. maps. Values are
 * validated by the form itself.
 */
const assertStructure = (definition: Record<string, unknown>) => {
  assertKnownKeys(definition, '', DEFINITION_KEYS);
  assertFieldList(definition.config, 'config');
  if (definition.auth !== undefined) {
    if (!isPlainObject(definition.auth)) {
      throw objectError('auth');
    }
    assertKnownKeys(definition.auth, 'auth', AUTH_KEYS);
  }
  if (definition.actions === undefined) {
    return;
  }
  if (!isPlainObject(definition.actions)) {
    throw mapError('actions', 'action name');
  }

  for (const [name, action] of Object.entries(definition.actions)) {
    const actionPath = `actions.${name}`;
    if (!isPlainObject(action)) {
      throw objectError(actionPath);
    }
    assertKnownKeys(action, actionPath, ACTION_KEYS);
    assertFieldList(action.input, `${actionPath}.input`);

    const { request } = action;
    if (request === undefined) {
      continue;
    }
    if (!isPlainObject(request)) {
      throw objectError(`${actionPath}.request`);
    }
    assertKnownKeys(request, `${actionPath}.request`, REQUEST_KEYS);
    if (request.headers !== undefined && !isPlainObject(request.headers)) {
      throw mapError(`${actionPath}.request.headers`, 'header name');
    }
    if (request.body !== undefined && !isPlainObject(request.body)) {
      throw objectError(`${actionPath}.request.body`);
    }
  }
};

/** Parses a YAML document whose keys mirror the create connector type request body. */
export const parseConnectorTypeYaml = (text: string): Partial<CreateConnectorTypeRequest> => {
  const parsed: unknown = parse(text);

  if (!isPlainObject(parsed)) {
    throw new Error(
      i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.yamlNotAnObjectError', {
        defaultMessage: 'The YAML must describe a single connector type definition.',
      })
    );
  }
  assertStructure(parsed);

  return parsed as Partial<CreateConnectorTypeRequest>;
};

/** Re-serializes a parsed definition as consistently indented block-style YAML. */
export const formatConnectorTypeYaml = (
  connectorType: Partial<CreateConnectorTypeRequest>
): string => stringify(connectorType, { indent: 2 });
