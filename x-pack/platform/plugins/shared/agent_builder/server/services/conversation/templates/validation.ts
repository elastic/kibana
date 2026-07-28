/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common';
import type {
  ConversationTemplate,
  ConversationTemplateField,
  ConversationTemplateFieldValidation,
} from '@kbn/agent-builder-common';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;

// ---------------------------------------------------------------------------
// Per-type value checks
// ---------------------------------------------------------------------------

const validateType = (templateId: string, field: ConversationTemplateField): void => {
  const { name, type, value } = field;
  if (value === undefined) return;

  switch (type) {
    case 'integer':
      if (value.trim() === '' || !Number.isInteger(Number(value))) {
        throw createBadRequestError(
          `Template "${templateId}" field "${name}": "${value}" is not a valid integer`
        );
      }
      break;
    case 'float':
      if (value.trim() === '' || Number.isNaN(Number(value))) {
        throw createBadRequestError(
          `Template "${templateId}" field "${name}": "${value}" is not a valid float`
        );
      }
      break;
    case 'boolean':
      if (value !== 'true' && value !== 'false') {
        throw createBadRequestError(
          `Template "${templateId}" field "${name}": "${value}" is not a valid boolean (expected "true" or "false")`
        );
      }
      break;
    case 'date':
      if (!ISO_DATE_RE.test(value)) {
        throw createBadRequestError(
          `Template "${templateId}" field "${name}": "${value}" is not a valid ISO 8601 date`
        );
      }
      break;
    case 'keyword':
    case 'text':
      break;
  }
};

// ---------------------------------------------------------------------------
// Validation-rule checks (mirror Cases v2 validators)
// ---------------------------------------------------------------------------

const validateRequired = (
  templateId: string,
  name: string,
  value: string | undefined,
  rules: ConversationTemplateFieldValidation
): void => {
  if (rules.required && (value === undefined || value.trim() === '')) {
    throw createBadRequestError(
      `Template "${templateId}" field "${name}": value is required`
    );
  }
};

const validatePattern = (
  templateId: string,
  name: string,
  value: string,
  rules: ConversationTemplateFieldValidation
): void => {
  if (!rules.pattern) return;
  const re = new RegExp(rules.pattern.regex);
  if (!re.test(value)) {
    const msg =
      rules.pattern.message ??
      `value "${value}" does not match pattern /${rules.pattern.regex}/`;
    throw createBadRequestError(`Template "${templateId}" field "${name}": ${msg}`);
  }
};

const validateLengthConstraints = (
  templateId: string,
  name: string,
  value: string,
  rules: ConversationTemplateFieldValidation
): void => {
  if (rules.min_length !== undefined && value.length < rules.min_length) {
    throw createBadRequestError(
      `Template "${templateId}" field "${name}": value must be at least ${rules.min_length} character(s)`
    );
  }
  if (rules.max_length !== undefined && value.length > rules.max_length) {
    throw createBadRequestError(
      `Template "${templateId}" field "${name}": value must be at most ${rules.max_length} character(s)`
    );
  }
};

const validateNumericConstraints = (
  templateId: string,
  name: string,
  value: string,
  rules: ConversationTemplateFieldValidation
): void => {
  const num = Number(value);
  if (rules.min !== undefined && num < rules.min) {
    throw createBadRequestError(
      `Template "${templateId}" field "${name}": value ${num} is less than minimum ${rules.min}`
    );
  }
  if (rules.max !== undefined && num > rules.max) {
    throw createBadRequestError(
      `Template "${templateId}" field "${name}": value ${num} is greater than maximum ${rules.max}`
    );
  }
};

const validateAllowedValues = (
  templateId: string,
  name: string,
  value: string,
  rules: ConversationTemplateFieldValidation
): void => {
  if (!rules.allowed_values) return;
  if (!rules.allowed_values.includes(value)) {
    throw createBadRequestError(
      `Template "${templateId}" field "${name}": value "${value}" is not in allowed_values [${rules.allowed_values.join(', ')}]`
    );
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates every field in a template definition:
 *  1. ES type compatibility of the value string (integer, float, boolean, date)
 *  2. Validation rules from the field's `validation` block:
 *     required, pattern, min_length/max_length (text/keyword), min/max (numeric),
 *     allowed_values
 *
 * Throws a bad-request error on the first violation.
 */
export const validateTemplateFields = (template: ConversationTemplate): void => {
  for (const field of template.definition.fields ?? []) {
    const { name, type, value, validation } = field;

    // 1. required check (runs even when value is undefined)
    if (validation?.required) {
      validateRequired(template.id, name, value, validation);
    }

    // 2. skip remaining checks when there is no value to inspect
    if (value === undefined) continue;

    // 3. ES type compatibility
    validateType(template.id, field);

    // 4. validation rules
    if (!validation) continue;

    validatePattern(template.id, name, value, validation);
    validateAllowedValues(template.id, name, value, validation);

    if (type === 'keyword' || type === 'text') {
      validateLengthConstraints(template.id, name, value, validation);
    }

    if (type === 'integer' || type === 'float') {
      validateNumericConstraints(template.id, name, value, validation);
    }
  }
};
