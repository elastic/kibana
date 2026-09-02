/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common';
import type {
  ConversationTemplate,
  ConversationTemplateFieldDefinition,
} from '@kbn/agent-builder-common';
import { compileFieldSchema } from './compile_schema';
import { MAX_OBJECT_DEPTH } from './limits';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;

interface FieldViolation {
  field: string;
  message: string;
}

const checkType = (
  fieldName: string,
  def: ConversationTemplateFieldDefinition,
  value: unknown
): string | null => {
  switch (def.input_type) {
    case 'TEXT':
    case 'SELECT':
    case 'DATE':
    case 'USER':
      if (typeof value !== 'string') {
        return `field "${fieldName}" (${def.input_type}): expected a string, got ${typeof value}`;
      }
      break;
    case 'NUMBER':
      if (typeof value !== 'number' && typeof value !== 'string') {
        return `field "${fieldName}" (NUMBER): expected a number or numeric string, got ${typeof value}`;
      }
      if (Number.isNaN(Number(value))) {
        return `field "${fieldName}" (NUMBER): "${value}" is not a valid number`;
      }
      break;
    case 'TOGGLE':
      if (typeof value !== 'boolean') {
        return `field "${fieldName}" (TOGGLE): expected a boolean, got ${typeof value}`;
      }
      break;
    case 'TEXT_ARRAY':
      if (!Array.isArray(value) && typeof value !== 'string') {
        return `field "${fieldName}" (TEXT_ARRAY): expected a string or an array of strings`;
      }
      if (Array.isArray(value) && !value.every((item) => typeof item === 'string')) {
        return `field "${fieldName}" (TEXT_ARRAY): all array items must be strings`;
      }
      break;
    case 'OBJECT':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `field "${fieldName}" (OBJECT): expected a plain object, got ${
          Array.isArray(value) ? 'array' : typeof value
        }`;
      }
      break;
    case 'OBJECT_ARRAY':
      if (!Array.isArray(value)) {
        return `field "${fieldName}" (OBJECT_ARRAY): expected an array of objects, got ${typeof value}`;
      }
      if (
        !value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
      ) {
        return `field "${fieldName}" (OBJECT_ARRAY): all array items must be plain objects`;
      }
      break;
    default:
      return `field "${fieldName}": unsupported input_type "${
        (def as ConversationTemplateFieldDefinition).input_type
      }"`;
  }
  return null;
};

const checkRequired = (fieldName: string, value: unknown): string | null => {
  const empty =
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    // Empty object {} has no keys and therefore carries no data — treat as unset.
    (typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0);
  return empty ? `field "${fieldName}": value is required` : null;
};

const checkSelect = (
  fieldName: string,
  def: ConversationTemplateFieldDefinition,
  value: string
): string | null => {
  if (!def.options || def.options.length === 0) return null;
  if (!def.options.includes(value)) {
    return `field "${fieldName}": "${value}" is not in allowed options [${def.options.join(', ')}]`;
  }
  return null;
};

const checkMaxLength = (
  fieldName: string,
  def: ConversationTemplateFieldDefinition,
  value: string | string[]
): string | null => {
  if (def.max_length === undefined) return null;
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    if (item.length > def.max_length) {
      return `field "${fieldName}": value exceeds max_length of ${def.max_length}`;
    }
  }
  return null;
};

const checkNumericRange = (
  fieldName: string,
  def: ConversationTemplateFieldDefinition,
  value: unknown
): string | null => {
  const num = Number(value);
  if (def.min !== undefined && num < def.min) {
    return `field "${fieldName}": value ${num} is less than minimum ${def.min}`;
  }
  if (def.max !== undefined && num > def.max) {
    return `field "${fieldName}": value ${num} is greater than maximum ${def.max}`;
  }
  return null;
};

const checkRegex = (
  fieldName: string,
  def: ConversationTemplateFieldDefinition,
  value: string
): string | null => {
  if (!def.regex) return null;
  const re = new RegExp(def.regex.pattern);
  if (!re.test(value)) {
    const msg =
      def.regex.message ?? `value "${value}" does not match pattern /${def.regex.pattern}/`;
    return `field "${fieldName}": ${msg}`;
  }
  return null;
};

const checkDateFormat = (fieldName: string, value: string): string | null => {
  if (!ISO_DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    return `field "${fieldName}": "${value}" is not a valid ISO 8601 date`;
  }
  return null;
};

/**
 * Validates a single field value supplied by the LLM or via the metadata API.
 * `required` is enforced here — this path is for writes, not template application.
 *
 * Returns an array of violation messages (empty = valid).
 */
export const collectFieldViolations = (
  fieldName: string,
  def: ConversationTemplateFieldDefinition,
  value: unknown,
  skipRequired = false
): string[] => {
  const violations: string[] = [];

  if (!skipRequired && def.required) {
    const v = checkRequired(fieldName, value);
    if (v) violations.push(v);
  }

  const typeMsg = checkType(fieldName, def, value);
  if (typeMsg) {
    violations.push(typeMsg);
    // Type mismatch: no point running constraint checks.
    return violations;
  }

  switch (def.input_type) {
    case 'SELECT': {
      const msg = checkSelect(fieldName, def, value as string);
      if (msg) violations.push(msg);
      const rMsg = checkRegex(fieldName, def, value as string);
      if (rMsg) violations.push(rMsg);
      break;
    }
    case 'TEXT': {
      const msg = checkMaxLength(fieldName, def, value as string);
      if (msg) violations.push(msg);
      const rMsg = checkRegex(fieldName, def, value as string);
      if (rMsg) violations.push(rMsg);
      break;
    }
    case 'NUMBER': {
      const msg = checkNumericRange(fieldName, def, value);
      if (msg) violations.push(msg);
      break;
    }
    case 'DATE': {
      const msg = checkDateFormat(fieldName, value as string);
      if (msg) violations.push(msg);
      break;
    }
    case 'TEXT_ARRAY': {
      const msg = checkMaxLength(fieldName, def, value as string | string[]);
      if (msg) violations.push(msg);
      break;
    }
    case 'OBJECT':
    case 'OBJECT_ARRAY': {
      // Delegate precise shape validation to the compiled zod schema.
      // Zod errors are mapped to the existing violation-string format, with the
      // nested path prepended so the message reads:
      //   field "indicators[0].type": Invalid enum value...
      const schema = compileFieldSchema(def);
      const result = schema.safeParse(value);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const pathStr =
            issue.path.length > 0
              ? issue.path
                  .map((seg) => (typeof seg === 'number' ? `[${seg}]` : `.${String(seg)}`))
                  .join('')
              : '';
          violations.push(`field "${fieldName}${pathStr}": ${issue.message}`);
        }
      }
      break;
    }
    // TOGGLE and USER have no extra constraints beyond type.
  }

  return violations;
};

/**
 * Validates every key in a metadata update against the template's field definitions.
 * Accumulates all per-field violations and throws a single bad-request error listing them.
 *
 * Throws when:
 *  - A key is not declared in the template.
 *  - Any field's value fails its type or constraint checks.
 *  - A required field is being set to an empty value.
 */
export const validateMetadataUpdate = (
  templateId: string,
  fields: Record<string, ConversationTemplateFieldDefinition>,
  updates: Record<string, unknown>
): void => {
  const allViolations: FieldViolation[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const def = fields[key];
    if (!def) {
      allViolations.push({
        field: key,
        message: `field "${key}" is not declared in template "${templateId}"`,
      });
      continue;
    }
    const msgs = collectFieldViolations(key, def, value);
    for (const msg of msgs) {
      allViolations.push({ field: key, message: msg });
    }
  }

  if (allViolations.length > 0) {
    const detail = allViolations.map((v) => v.message).join('; ');
    throw createBadRequestError(`Metadata validation failed: ${detail}`);
  }
};

/**
 * Validates default values declared in a template definition.
 * `required` is intentionally skipped — fields start empty when a template
 * is first applied; the LLM (or a human) fills them in via subsequent writes.
 *
 * Throws a bad-request error on the first type or constraint violation.
 */
export const validateTemplateDefaults = (template: ConversationTemplate): void => {
  for (const [fieldName, def] of Object.entries(template.fields)) {
    if (def.default_value === undefined) continue;
    const msgs = collectFieldViolations(fieldName, def, def.default_value, /* skipRequired */ true);
    if (msgs.length > 0) {
      throw createBadRequestError(
        `Template "${template.id}" has invalid default for field "${fieldName}": ${msgs.join('; ')}`
      );
    }
  }
};

/**
 * Recursive worker for `collectTemplateDefinitionErrors`.
 *
 * @param fields   The record of field definitions to validate.
 * @param prefix   Dotted path prefix for error messages when validating nested `properties`.
 * @param depth    Current nesting depth (0 = top level).
 */
const collectFieldDefinitionErrors = (
  fields: Record<string, ConversationTemplateFieldDefinition>,
  prefix: string,
  depth = 0
): string[] => {
  const errors: string[] = [];

  for (const [fieldName, def] of Object.entries(fields)) {
    const qualifiedName = prefix ? `${prefix}.${fieldName}` : fieldName;
    const { input_type: inputType } = def;

    if (inputType === 'SELECT') {
      if (!def.options || def.options.length === 0) {
        errors.push(`field "${qualifiedName}" (SELECT): must declare non-empty "options"`);
      }
    }

    if (def.max_length !== undefined && inputType !== 'TEXT' && inputType !== 'TEXT_ARRAY') {
      errors.push(`field "${qualifiedName}": "max_length" is only valid for TEXT and TEXT_ARRAY`);
    }

    if ((def.min !== undefined || def.max !== undefined) && inputType !== 'NUMBER') {
      errors.push(`field "${qualifiedName}": "min"/"max" constraints are only valid for NUMBER`);
    }

    if (def.regex !== undefined && inputType !== 'TEXT' && inputType !== 'SELECT') {
      errors.push(`field "${qualifiedName}": "regex" constraint is only valid for TEXT and SELECT`);
    }

    if (def.options !== undefined && inputType !== 'SELECT') {
      errors.push(`field "${qualifiedName}": "options" is only valid for SELECT`);
    }

    // OBJECT / OBJECT_ARRAY: `properties` is required; all other types must not declare it.
    if (inputType === 'OBJECT' || inputType === 'OBJECT_ARRAY') {
      if (!def.properties || Object.keys(def.properties).length === 0) {
        errors.push(`field "${qualifiedName}" (${inputType}): must declare non-empty "properties"`);
      } else {
        // Enforce the maximum nesting depth.
        if (depth >= MAX_OBJECT_DEPTH) {
          errors.push(
            `field "${qualifiedName}": object nesting exceeds the maximum depth of ${MAX_OBJECT_DEPTH}`
          );
        } else {
          // Recurse into nested properties.
          const nestedErrors = collectFieldDefinitionErrors(
            def.properties,
            qualifiedName,
            depth + 1
          );
          errors.push(...nestedErrors);
        }
      }
    } else {
      if (def.properties !== undefined) {
        errors.push(
          `field "${qualifiedName}": "properties" is only valid for OBJECT and OBJECT_ARRAY`
        );
      }
    }

    // `max_items` is only valid for OBJECT_ARRAY.
    if (def.max_items !== undefined && inputType !== 'OBJECT_ARRAY') {
      errors.push(`field "${qualifiedName}": "max_items" is only valid for OBJECT_ARRAY`);
    }

    // Nested `default_value` is not supported for any type declared inside `properties`.
    // Defaults are a top-level concept — a nested default would require deep-merge
    // semantics and is ambiguous (does a missing key mean "use default" or "leave unset"?).
    if (depth > 0 && def.default_value !== undefined) {
      errors.push(
        `field "${qualifiedName}": "default_value" is not supported inside nested "properties"; set defaults only on top-level fields`
      );
    }

    // Validate default_value type matches input_type (only for top-level fields).
    if (depth === 0 && def.default_value !== undefined) {
      const msgs = collectFieldViolations(qualifiedName, def, def.default_value, true);
      for (const msg of msgs) {
        errors.push(`(default_value) ${msg}`);
      }
    }
  }

  return errors;
};

/**
 * Validates the template definition itself — ensures every field's constraints
 * are internally consistent so the template will always compile to a usable validator.
 *
 * Returns an array of error strings (empty = valid template).
 */
export const collectTemplateDefinitionErrors = (template: ConversationTemplate): string[] => {
  return collectFieldDefinitionErrors(template.fields, /* prefix */ '');
};

/**
 * Throws if the template definition is not self-consistent.
 * Call this when registering code templates and when persisting user-authored templates.
 */
export const validateTemplateDefinition = (template: ConversationTemplate): void => {
  const errors = collectTemplateDefinitionErrors(template);
  if (errors.length > 0) {
    throw createBadRequestError(
      `Template "${template.id}" definition is invalid: ${errors.join('; ')}`
    );
  }
};
