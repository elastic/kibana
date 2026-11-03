/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { FieldError, FieldErrors, Resolver } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { z } from '@kbn/zod/v4';
import {
  createConnectorTypeRequestSchema,
  headerNameSchema,
  identifierSchema,
} from '@kbn/actions-plugin/common';
import type { BuildConnectorFormData } from './types';
import { formDataToRequest } from './form_serializers';
import { parseJsonObject } from './json_body';

type AddError = (formPath: string, message: string, type?: string) => void;

/** Scalar form paths that render their own editor. */
const EDITABLE_PATHS = new Set([
  'displayName',
  'id',
  'description',
  'auth.type',
  'auth.headerName',
]);
/** Row fields of a field list (`config`, action inputs). */
const FIELD_ROW_KEYS = new Set(['name', 'type', 'items', 'required', 'label', 'description']);

const FIELD_NAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.requiredFieldName',
  { defaultMessage: 'Field name is required.' }
);
const IDENTIFIER_FORMAT = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.invalidIdentifier',
  { defaultMessage: 'Must start with a letter and use only letters, numbers and "_".' }
);
const HEADER_NAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.requiredHeaderName',
  { defaultMessage: 'Header name is required.' }
);
const HEADER_NAME_FORMAT = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.invalidHeaderName',
  { defaultMessage: 'Use only letters, numbers and "-".' }
);
const ACTION_NAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.requiredActionName',
  { defaultMessage: 'Action name is required.' }
);

/** Messages for empty values, keyed by form path with `*` for row indexes. */
const REQUIRED_MESSAGES: Record<string, string> = {
  displayName: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.requiredName',
    { defaultMessage: 'Name is required.' }
  ),
  id: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.error.requiredId', {
    defaultMessage: 'Connector type ID is required.',
  }),
  'auth.headerName': HEADER_NAME_REQUIRED,
  'config.*.name': FIELD_NAME_REQUIRED,
  'actions.*.name': ACTION_NAME_REQUIRED,
  'actions.*.input.*.name': FIELD_NAME_REQUIRED,
  'actions.*.request.url': i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.requiredUrl',
    { defaultMessage: 'URL is required.' }
  ),
  'actions.*.request.headers.*.key': HEADER_NAME_REQUIRED,
};

/** Messages for `invalid_format` issues, keyed like `REQUIRED_MESSAGES`. */
const FORMAT_MESSAGES: Record<string, string> = {
  id: i18n.translate(
    'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.invalidIdFormat',
    {
      defaultMessage: 'Use only lowercase letters, numbers, "_" and "-".',
    }
  ),
  'auth.headerName': HEADER_NAME_FORMAT,
  'config.*.name': IDENTIFIER_FORMAT,
  'actions.*.name': IDENTIFIER_FORMAT,
  'actions.*.input.*.name': IDENTIFIER_FORMAT,
  'actions.*.request.headers.*.key': HEADER_NAME_FORMAT,
};

/** Normalizes a row path like `actions.1.input.3.name` to the `actions.*.input.*.name` message key. */
const toMessageKey = (formPath: string): string => formPath.replace(/\.\d+(?=\.)/g, '.*');

const toActionFormPath = (
  segments: string[],
  code: string,
  values: BuildConnectorFormData
): string => {
  const [, actionName, section, part, detail] = segments;
  if (segments.length === 1) {
    return 'actions.root';
  }
  const actionIndex = values.actions.findIndex((action) => action.name === actionName);
  if (actionIndex < 0) {
    return 'actions.root';
  }
  const action = `actions.${actionIndex}`;

  if (segments.length === 2) {
    // Either the record key (the action name) or the action object itself failed.
    return code === 'unrecognized_keys' || code === 'invalid_type'
      ? `${action}.root`
      : `${action}.name`;
  }
  if (section === 'description' || section === 'scope') {
    return `${action}.${section}`;
  }
  if (section === 'input') {
    return segments.length >= 5 && FIELD_ROW_KEYS.has(detail)
      ? `${action}.input.${part}.${detail}`
      : `${action}.input.root`;
  }
  if (section === 'request') {
    if (part === 'method' || part === 'url' || part === 'path' || part === 'body') {
      return `${action}.request.${part}`;
    }
    if (part === 'headers') {
      const headerIndex = values.actions[actionIndex].request.headers.findIndex(
        (header) => header.key === detail
      );
      if (detail === undefined || headerIndex < 0) {
        return `${action}.request.headers.root`;
      }
      const isKeyIssue =
        code === 'invalid_key' || code === 'invalid_format' || code === 'too_small';
      return `${action}.request.headers.${headerIndex}.${isKeyIssue ? 'key' : 'value'}`;
    }
    return `${action}.request.root`;
  }
  return `${action}.root`;
};

/** Maps a schema issue path (request shape) onto the form field that can fix it. */
const toFormPath = (issue: z.ZodIssue, values: BuildConnectorFormData): string => {
  const segments = issue.path.map(String);
  const path = segments.join('.');
  if (EDITABLE_PATHS.has(path)) {
    return path;
  }
  if (path === 'auth') {
    return 'auth.type';
  }
  const [root, index, key] = segments;
  if (root === 'config') {
    return segments.length >= 3 && FIELD_ROW_KEYS.has(key)
      ? `config.${index}.${key}`
      : 'config.root';
  }
  if (root === 'actions') {
    return toActionFormPath(segments, issue.code, values);
  }
  return path ? root : 'root';
};

const toMessage = (
  issue: z.core.$ZodIssue,
  formPath: string,
  values: BuildConnectorFormData
): string => {
  const value = get(values, formPath);
  const messageKey = toMessageKey(formPath);
  if (REQUIRED_MESSAGES[messageKey] && (value === '' || value === undefined)) {
    return REQUIRED_MESSAGES[messageKey];
  }
  if (FORMAT_MESSAGES[messageKey] && issue.code === 'invalid_format') {
    return FORMAT_MESSAGES[messageKey];
  }
  const issuePath = issue.path.map(String).join('.');
  // Issues that can only be shown at the top keep their path for context.
  return formPath === 'root' && issuePath ? `${issuePath}: ${issue.message}` : issue.message;
};

const DUPLICATE_ACTION_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.duplicateActionName',
  { defaultMessage: 'Action names must be unique.' }
);
const DUPLICATE_HEADER_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.duplicateHeaderName',
  { defaultMessage: 'Header names must be unique.' }
);

interface KeyMessages {
  required: string;
  format: string;
  duplicate: string;
}

/** Reports an empty, malformed or repeated name; returns whether it is usable as a record key. */
const validateKey = (
  key: string,
  seen: Set<string>,
  schema: typeof identifierSchema | typeof headerNameSchema,
  messages: KeyMessages,
  formPath: string,
  addError: AddError
): boolean => {
  if (!key) {
    addError(formPath, messages.required);
    return false;
  }
  const result = schema.safeParse(key);
  if (!result.success) {
    const [issue] = result.error.issues;
    addError(formPath, issue.code === 'invalid_format' ? messages.format : issue.message);
    return false;
  }
  if (seen.has(key)) {
    addError(formPath, messages.duplicate);
    return false;
  }
  seen.add(key);
  return true;
};

/**
 * Checks that only the form can see, and that must pass before the schema can look at an action:
 * the schema receives actions and headers keyed by name and skips the value of an invalid key.
 * Returns the values with every unusable key replaced by a placeholder so the rest of the
 * definition is still validated in the same pass.
 */
const validateFormOnly = (
  values: BuildConnectorFormData,
  addError: AddError
): BuildConnectorFormData => {
  const actionNames = new Set<string>();
  const actionMessages: KeyMessages = {
    required: ACTION_NAME_REQUIRED,
    format: IDENTIFIER_FORMAT,
    duplicate: DUPLICATE_ACTION_NAME,
  };
  const headerMessages: KeyMessages = {
    required: HEADER_NAME_REQUIRED,
    format: HEADER_NAME_FORMAT,
    duplicate: DUPLICATE_HEADER_NAME,
  };

  const actions = values.actions.map((action, actionIndex) => {
    const actionPath = `actions.${actionIndex}`;
    const isNameUsable = validateKey(
      action.name,
      actionNames,
      identifierSchema,
      actionMessages,
      `${actionPath}.name`,
      addError
    );

    const headerNames = new Set<string>();
    const headers = action.request.headers.map((header, headerIndex) => {
      const isKeyUsable = validateKey(
        header.key,
        headerNames,
        headerNameSchema,
        headerMessages,
        `${actionPath}.request.headers.${headerIndex}.key`,
        addError
      );
      return isKeyUsable ? header : { ...header, key: `placeholder-header-${headerIndex}` };
    });

    const { error: bodyError } = parseJsonObject(action.request.body);
    if (bodyError) {
      addError(`${actionPath}.request.body`, bodyError);
    }

    return {
      ...action,
      name: isNameUsable ? action.name : `placeholderAction${actionIndex}`,
      request: { ...action.request, headers },
    };
  });

  return { ...values, actions };
};

/**
 * Validates the form with the same schema the API applies, so a definition that passes here is
 * accepted by the server, and maps each issue onto the form field that can fix it.
 */
export const buildConnectorFormResolver: Resolver<BuildConnectorFormData> = (values) => {
  const errors: FieldErrors<BuildConnectorFormData> = {};
  const addError: AddError = (formPath, message, type = 'custom') => {
    // Keep the first issue reported for a field.
    if (!get(errors, formPath)) {
      const error: FieldError = { type, message };
      set(errors, formPath, error);
    }
  };

  const validationValues = validateFormOnly(values, addError);

  const result = createConnectorTypeRequestSchema.safeParse(formDataToRequest(validationValues));
  if (!result.success) {
    for (const issue of result.error.issues) {
      // Paths are resolved against the placeholder names; messages against what the user typed.
      const formPath = toFormPath(issue, validationValues);
      addError(formPath, toMessage(issue, formPath, values), issue.code);
    }
  }

  return isEmpty(errors) ? { values, errors: {} } : { values: {}, errors };
};
