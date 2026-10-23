/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { parse } from 'yaml';
import type { InlineActionStepDefinition } from '../registry';

export interface ParsedInlineParams {
  params?: Record<string, unknown>;
  errors: string[];
}

const invalidYaml = (reason: string): string =>
  i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.validation.invalidYaml', {
    defaultMessage: 'Invalid YAML: {reason}',
    values: { reason },
  });

const paramsNotAMap = (): string =>
  i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.validation.paramsNotAMap', {
    defaultMessage: 'Parameters must be a YAML map of field names to values.',
  });

const fieldRequired = (field: string): string =>
  i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.validation.fieldRequired', {
    defaultMessage: "''{field}'' is required.",
    values: { field },
  });

const fieldMustBeString = (field: string): string =>
  i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.validation.fieldMustBeString', {
    defaultMessage: "''{field}'' must be a string.",
    values: { field },
  });

const fieldMustBeStringList = (field: string): string =>
  i18n.translate(
    'xpack.alertingV2.alertingV2RuleForm.actionForm.validation.fieldMustBeStringList',
    {
      defaultMessage: "''{field}'' must be a list of strings.",
      values: { field },
    }
  );

const fieldMustNotContainEmptyValues = (field: string): string =>
  i18n.translate(
    'xpack.alertingV2.alertingV2RuleForm.actionForm.validation.fieldMustNotContainEmptyValues',
    {
      defaultMessage: "''{field}'' must not contain empty values.",
      values: { field },
    }
  );

const unknownFields = (fields: string[]): string =>
  i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.validation.unknownFields', {
    defaultMessage:
      '{count, plural, one {Unknown field: {fields}.} other {Unknown fields: {fields}.}}',
    values: { count: fields.length, fields: fields.map((field) => `'${field}'`).join(', ') },
  });

/**
 * Parses the inline-action params YAML and validates it against the step's
 * params schema, returning the parsed params or user-facing error messages.
 */
export const parseInlineParams = (
  definition: InlineActionStepDefinition,
  params: string
): ParsedInlineParams => {
  let parsed: unknown;
  try {
    parsed = parse(params, { logLevel: 'error' });
  } catch (err) {
    // The first line of the parser's message holds the reason and its location.
    const reason =
      err instanceof Error ? err.message.split('\n')[0].replace(/:$/, '') : String(err);
    return { errors: [invalidYaml(reason)] };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { errors: [paramsNotAMap()] };
  }

  const result = definition.paramsSchema.safeParse(parsed);
  if (result.success) {
    return { params: result.data, errors: [] };
  }

  const errors = result.error.issues.map((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return unknownFields(issue.keys);
    }
    const field = String(issue.path[0]);
    const isOptional = definition.paramsSchema.shape[field]?.isOptional() ?? false;
    const isMissing = Reflect.get(parsed, field) == null && !isOptional;
    if (issue.code === 'invalid_type' && !isMissing) {
      const isList = issue.expected === 'array' || issue.path.length > 1;
      return isList ? fieldMustBeStringList(field) : fieldMustBeString(field);
    }
    return isOptional ? fieldMustNotContainEmptyValues(field) : fieldRequired(field);
  });

  return { errors: [...new Set(errors)] };
};
