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

const validateType = (
  templateId: string,
  field: ConversationTemplateField & { value?: string | boolean }
): void => {
  const { name, type, value } = field;
  if (value === undefined) return;

  switch (type) {
    case 'integer':
      if (typeof value !== 'string' || value.trim() === '' || !Number.isInteger(Number(value))) {
        throw createBadRequestError(
          `Template "${templateId}" field "${name}": "${value}" is not a valid integer`
        );
      }
      break;
    case 'float':
      if (typeof value !== 'string' || value.trim() === '' || Number.isNaN(Number(value))) {
        throw createBadRequestError(
          `Template "${templateId}" field "${name}": "${value}" is not a valid float`
        );
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw createBadRequestError(
          `Template "${templateId}" field "${name}": value must be a boolean (true or false), got "${value}"`
        );
      }
      break;
    case 'date':
      if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) {
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
  value: string | boolean | undefined,
  rules: ConversationTemplateFieldValidation
): void => {
  if (rules.required && (value === undefined || value === '')) {
    throw createBadRequestError(`Template "${templateId}" field "${name}": value is required`);
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
      rules.pattern.message ?? `value "${value}" does not match pattern /${rules.pattern.regex}/`;
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
      `Template "${templateId}" field "${name}": value "${value}" is not in allowed_values [${rules.allowed_values.join(
        ', '
      )}]`
    );
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a single field value supplied by the LLM via set_conversation_metadata.
 * Includes the `required` check so the agent cannot write an empty string for a
 * field that is marked required.
 *
 * Throws a bad-request error on the first violation.
 */
export const validateSingleField = (
  templateId: string,
  field: ConversationTemplateField,
  value: string | boolean
): void => {
  const { name, type, validation } = field;

  if (validation?.required) {
    validateRequired(templateId, name, value, validation);
  }

  validateType(templateId, { ...field, value });

  // Boolean values don't support pattern / allowed_values / length / numeric checks.
  if (type === 'boolean') return;

  if (!validation) return;

  const strValue = value as string;
  validatePattern(templateId, name, strValue, validation);
  validateAllowedValues(templateId, name, strValue, validation);

  if (type === 'keyword' || type === 'text') {
    validateLengthConstraints(templateId, name, strValue, validation);
  }

  if (type === 'integer' || type === 'float') {
    validateNumericConstraints(templateId, name, strValue, validation);
  }
};

/**
 * Validates every field in a template definition against its default value.
 * The `required` rule is intentionally skipped here — fields start empty when
 * a template is first applied; the LLM fills them in via set_conversation_metadata.
 *
 * Throws a bad-request error on the first type or constraint violation.
 */
export const validateTemplateFields = (template: ConversationTemplate): void => {
  for (const field of template.definition.fields ?? []) {
    const { type, value, validation } = field;

    // Skip fields with no default value — nothing to validate yet.
    if (value === undefined) continue;

    validateType(template.id, field);

    if (type === 'boolean' || !validation) continue;

    const strValue = value as string;
    validatePattern(template.id, field.name, strValue, validation);
    validateAllowedValues(template.id, field.name, strValue, validation);

    if (type === 'keyword' || type === 'text') {
      validateLengthConstraints(template.id, field.name, strValue, validation);
    }

    if (type === 'integer' || type === 'float') {
      validateNumericConstraints(template.id, field.name, strValue, validation);
    }
  }
};
