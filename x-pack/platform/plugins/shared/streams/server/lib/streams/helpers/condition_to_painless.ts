/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isString, uniq } from 'lodash';
import {
  BinaryFilterCondition,
  Condition,
  FilterCondition,
  UnaryFilterCondition,
  isAlwaysCondition,
  isAndCondition,
  isFilterCondition,
  isNeverCondition,
  isOrCondition,
  isUnaryFilterCondition,
} from '@kbn/streams-schema';

function safePainlessField(conditionOrField: FilterCondition | string) {
  if (typeof conditionOrField === 'string') {
    return `relevant_fields['${conditionOrField}']`;
  }

  return `relevant_fields['${conditionOrField.field}']`;
}

function encodeValue(value: string | number | boolean) {
  if (isString(value)) {
    return `"${value}"`;
  }
  if (isBoolean(value)) {
    return value ? 'true' : 'false';
  }
  return value;
}

function binaryToPainless(condition: BinaryFilterCondition) {
  switch (condition.operator) {
    case 'neq':
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString() != ${encodeValue(String(condition.value))}) || ${safePainlessField(
        condition
      )} != ${encodeValue(String(condition.value))})`;
    case 'lt':
      return `((${safePainlessField(
        condition
      )} instanceof String && Float.parseFloat(${safePainlessField(condition)}) < ${encodeValue(
        Number(condition.value)
      )}) || ${safePainlessField(condition)} < ${encodeValue(Number(condition.value))})`;
    case 'lte':
      return `((${safePainlessField(
        condition
      )} instanceof String && Float.parseFloat(${safePainlessField(condition)}) <= ${encodeValue(
        Number(condition.value)
      )}) || ${safePainlessField(condition)} <= ${encodeValue(Number(condition.value))})`;
    case 'gt':
      return `((${safePainlessField(
        condition
      )} instanceof String && Float.parseFloat(${safePainlessField(condition)}) > ${encodeValue(
        Number(condition.value)
      )}) || ${safePainlessField(condition)} > ${encodeValue(Number(condition.value))})`;
    case 'gte':
      return `((${safePainlessField(
        condition
      )} instanceof String && Float.parseFloat(${safePainlessField(condition)}) >= ${encodeValue(
        Number(condition.value)
      )}) || ${safePainlessField(condition)} >= ${encodeValue(Number(condition.value))})`;
    case 'startsWith':
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString().startsWith(${encodeValue(String(condition.value))})) || ${safePainlessField(
        condition
      )}.startsWith(${encodeValue(String(condition.value))}))`;
    case 'endsWith':
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString().endsWith(${encodeValue(String(condition.value))})) || ${safePainlessField(
        condition
      )}.endsWith(${encodeValue(String(condition.value))}))`;
    case 'contains':
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString().contains(${encodeValue(String(condition.value))})) || ${safePainlessField(
        condition
      )}.contains(${encodeValue(String(condition.value))}))`;
    default:
      return `((${safePainlessField(condition)} instanceof Number && ${safePainlessField(
        condition
      )}.toString() == ${encodeValue(String(condition.value))}) || ${safePainlessField(
        condition
      )} == ${encodeValue(String(condition.value))})`;
  }
}

function unaryToPainless(condition: UnaryFilterCondition) {
  switch (condition.operator) {
    case 'notExists':
      return `${safePainlessField(condition)} == null`;
    default:
      return `${safePainlessField(condition)} !== null`;
  }
}

function extractAllFields(condition: Condition, fields: string[] = []): string[] {
  if (isFilterCondition(condition)) {
    return uniq([...fields, condition.field]);
  } else if (isAndCondition(condition)) {
    return uniq(condition.and.map((cond) => extractAllFields(cond, fields)).flat());
  } else if (isOrCondition(condition)) {
    return uniq(condition.or.map((cond) => extractAllFields(cond, fields)).flat());
  }
  return uniq(fields);
}

function generateFieldDefinition(field: string) {
  const parts = field.split('.');
  const firstPart = parts[0];
  let code = `relevant_fields['${field}'] = ctx['${firstPart}'];\n`;
  for (let i = 1; i < parts.length; i++) {
    code += `if (relevant_fields['${field}'] != null) {
  if (relevant_fields['${field}'] instanceof Map) {
    relevant_fields['${field}'] = relevant_fields['${field}']['${parts[i]}'];
  } else {
    relevant_fields['${field}'] = null;
  }
}\n`;
  }
  return code;
}

function generateFieldDefinitions(fields: string[]) {
  return `
${fields.map(generateFieldDefinition).join('\n')}
  `;
}

export function conditionToStatement(condition: Condition, nested = false): string {
  if (isFilterCondition(condition)) {
    if (isUnaryFilterCondition(condition)) {
      return unaryToPainless(condition);
    }
    return `(${safePainlessField(condition)} !== null && ${binaryToPainless(condition)})`;
  }
  if (isAndCondition(condition)) {
    const and = condition.and.map((filter) => conditionToStatement(filter, true)).join(' && ');
    return nested ? `(${and})` : and;
  }
  if (isOrCondition(condition)) {
    const or = condition.or.map((filter) => conditionToStatement(filter, true)).join(' || ');
    return nested ? `(${or})` : or;
  }
  if (isAlwaysCondition(condition)) {
    return `true;`;
  }

  if (isNeverCondition(condition)) {
    return `false;`;
  }

  throw new Error('Unsupported condition');
}

export function conditionToPainless(condition: Condition): string {
  if (isNeverCondition(condition)) {
    return `return false`;
  }

  if (isAlwaysCondition(condition)) {
    return `return true`;
  }

  const fields = extractAllFields(condition);
  let fieldDefinitions = '';
  if (fields.length !== 0) {
    fieldDefinitions = generateFieldDefinitions(fields);
  }
  return `
  def relevant_fields = [:];
  ${fieldDefinitions}
  try {
  if (${conditionToStatement(condition)}) {
    return true;
  }
  return false;
} catch (Exception e) {
  return false;
}
`;
}
