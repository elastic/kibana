/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFinite } from 'lodash';
import type {
  Condition,
  FilterCondition,
  RangeCondition,
  ShorthandBinaryFilterCondition,
  ShorthandUnaryFilterCondition,
  StringOrNumberOrBoolean,
} from '../../types/conditions';
import { BINARY_OPERATORS } from '../../types/conditions';
import { painlessFieldAccessor } from '../../types/utils';
import { encodeValue } from '../../types/utils/painless_encoding';
import { evaluateDateMath } from './painless_date_math_helpers';

// Type for mapping field names to variable names
type FieldVarMap = Map<string, string>;

// Extract all unique field names from a condition recursively
function extractFieldNames(condition: Condition, fields: Set<string> = new Set()): Set<string> {
  if ('field' in condition && typeof condition.field === 'string') {
    fields.add(condition.field);
  }
  if ('and' in condition && Array.isArray(condition.and)) {
    condition.and.forEach((c) => extractFieldNames(c, fields));
  }
  if ('or' in condition && Array.isArray(condition.or)) {
    condition.or.forEach((c) => extractFieldNames(c, fields));
  }
  if ('not' in condition && condition.not) {
    extractFieldNames(condition.not, fields);
  }
  return fields;
}

// Convert a field name to a valid Painless variable name
function fieldToVarName(field: string): string {
  // Replace special characters with underscores and prefix with 'val_'
  return 'val_' + field.replace(/[^a-zA-Z0-9]/g, '_');
}

// Generate variable declaration with single-element List unwrapping
function generateFieldDeclaration(field: string, varName: string): string {
  return `def ${varName} = $('${field}', null); if (${varName} instanceof List && ${varName}.size() == 1) { ${varName} = ${varName}[0]; }`;
}

// Utility: get the field accessor - uses varMap if provided, otherwise inline accessor
function safePainlessField(conditionOrField: FilterCondition | string, varMap?: FieldVarMap) {
  const fieldName =
    typeof conditionOrField === 'string' ? conditionOrField : conditionOrField.field;

  // If we have a varMap and it contains this field, use the variable name
  if (varMap && varMap.has(fieldName)) {
    return varMap.get(fieldName)!;
  }

  return painlessFieldAccessor(fieldName);
}

function generateRangeComparisonClauses(
  field: string,
  operator: 'gt' | 'gte' | 'lt' | 'lte',
  value: StringOrNumberOrBoolean
): { numberClause: string; stringClause: string } {
  const opMap: Record<typeof operator, string> = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
  };
  const opSymbol = opMap[operator];

  // Check if the value is numeric
  const numericValue = typeof value === 'number' ? value : Number(value);
  const isNumeric = isFinite(numericValue);

  if (isNumeric) {
    // Handle numeric comparisons (integers, floats)
    return {
      numberClause: `${field} ${opSymbol} ${encodeValue(numericValue)}`,
      stringClause: `Float.parseFloat(${field}) ${opSymbol} ${encodeValue(numericValue)}`,
    };
  } else {
    // Check if it's a date math expression
    const stringValue = String(value);
    const comparisonValue = evaluateDateMath(stringValue);

    // Handle string comparisons (dates, etc.) - use compareTo for strings
    return {
      numberClause: `String.valueOf(${field}).compareTo(${comparisonValue}) ${opSymbol} 0`,
      stringClause: `${field}.compareTo(${comparisonValue}) ${opSymbol} 0`,
    };
  }
}

// Convert a shorthand binary filter condition to painless
function shorthandBinaryToPainless(
  condition: ShorthandBinaryFilterCondition,
  varMap?: FieldVarMap
) {
  const safeFieldAccessor = safePainlessField(condition, varMap);
  // Find which operator is present
  const op = BINARY_OPERATORS.find((k) => condition[k] !== undefined);

  if (!op) {
    throw new Error('No valid binary operator found in condition');
  }

  const value = condition[op];

  switch (op) {
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const { numberClause, stringClause } = generateRangeComparisonClauses(
        safeFieldAccessor,
        op as 'gt' | 'gte' | 'lt' | 'lte',
        Number(value)
      );
      return `((${safeFieldAccessor} instanceof String && ${stringClause}) || ${numberClause})`;
    }
    case 'startsWith':
      return `((${safeFieldAccessor} instanceof Number && ${safeFieldAccessor}.toString().startsWith(${encodeValue(
        String(value)
      )})) || ${safeFieldAccessor}.startsWith(${encodeValue(String(value))}))`;
    case 'endsWith':
      return `((${safeFieldAccessor} instanceof Number && ${safeFieldAccessor}.toString().endsWith(${encodeValue(
        String(value)
      )})) || ${safeFieldAccessor}.endsWith(${encodeValue(String(value))}))`;
    case 'contains':
      // Behaviour is "fuzzy"
      return `((${safeFieldAccessor} instanceof Number && ${safeFieldAccessor}.toString().toLowerCase().contains(${encodeValue(
        String(value).toLowerCase()
      )})) || ${safeFieldAccessor}.toLowerCase().contains(${encodeValue(
        String(value).toLowerCase()
      )}))`;
    case 'range': {
      const range = value as RangeCondition;

      // Build clauses for both Number and String types using generateComparisonClauses
      const numberClauses: string[] = [];
      const stringClauses: string[] = [];

      if (range.gte !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'gte',
          range.gte
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.lte !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'lte',
          range.lte
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.gt !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'gt',
          range.gt
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }
      if (range.lt !== undefined) {
        const { numberClause, stringClause } = generateRangeComparisonClauses(
          safeFieldAccessor,
          'lt',
          range.lt
        );
        numberClauses.push(numberClause);
        stringClauses.push(stringClause);
      }

      const numberExpr = numberClauses.length > 0 ? numberClauses.join(' && ') : 'true';
      const stringExpr = stringClauses.length > 0 ? stringClauses.join(' && ') : 'true';

      return `((${safeFieldAccessor} instanceof Number && ${numberExpr}) || (${safeFieldAccessor} instanceof String && ${stringExpr}))`;
    }
    case 'includes': {
      // Handle both List (multivalue) and single value (after unwrapping of single-element lists)
      // Fast path: try direct contains first (works if types already match)
      // Fallback: convert elements to strings for type-safe comparison
      const encodedValue = encodeValue(value as StringOrNumberOrBoolean);
      const encodedStringValue = encodeValue(String(value));
      // If List: check contains or string match. If single value (unwrapped): check equality
      return `(${safeFieldAccessor} instanceof List ? (${safeFieldAccessor}.contains(${encodedValue}) || ${safeFieldAccessor}.stream().anyMatch(e -> String.valueOf(e).equals(${encodedStringValue}))) : (${safeFieldAccessor} == ${encodedValue} || String.valueOf(${safeFieldAccessor}).equals(${encodedStringValue})))`;
    }
    case 'neq':
    default: // eq
      const operator = op === 'neq' ? '!=' : '==';
      return `((${safeFieldAccessor} instanceof Number && ${safeFieldAccessor}.toString() ${operator} ${encodeValue(
        String(value)
      )}) || ${safeFieldAccessor} ${operator} ${encodeValue(value as StringOrNumberOrBoolean)})`;
  }
}

// Convert a shorthand unary filter condition to painless
function shorthandUnaryToPainless(condition: ShorthandUnaryFilterCondition, varMap?: FieldVarMap) {
  if ('exists' in condition) {
    if (typeof condition.exists === 'boolean') {
      return condition.exists
        ? `${safePainlessField(condition, varMap)} !== null`
        : `${safePainlessField(condition, varMap)} == null`;
    } else {
      throw new Error('Invalid value for exists operator, expected boolean');
    }
  }

  throw new Error('Invalid unary filter condition');
}

// Main recursive conversion to painless
export function conditionToStatement(
  condition: Condition,
  nested = false,
  varMap?: FieldVarMap
): string {
  if ('field' in condition && typeof condition.field === 'string') {
    // Shorthand unary
    if ('exists' in condition) {
      return shorthandUnaryToPainless(condition as ShorthandUnaryFilterCondition, varMap);
    }
    // Shorthand binary
    return `(${safePainlessField(condition, varMap)} !== null && ${shorthandBinaryToPainless(
      condition as ShorthandBinaryFilterCondition,
      varMap
    )})`;
  }
  if ('and' in condition && Array.isArray(condition.and)) {
    const and = condition.and
      .map((filter) => conditionToStatement(filter, true, varMap))
      .join(' && ');
    return nested ? `(${and})` : and;
  }
  if ('or' in condition && Array.isArray(condition.or)) {
    const or = condition.or
      .map((filter) => conditionToStatement(filter, true, varMap))
      .join(' || ');
    return nested ? `(${or})` : or;
  }
  if ('not' in condition && condition.not) {
    return `!(${conditionToStatement(condition.not, true, varMap)})`;
  }
  // Always/never conditions (if you have them)
  if ('always' in condition) {
    return `true`;
  }
  if ('never' in condition) {
    return `false`;
  }
  throw new Error('Unsupported condition');
}

export function conditionToPainless(condition: Condition): string {
  // Always/never conditions (if you have them)
  if ('never' in condition) {
    return `return false`;
  }
  if ('always' in condition) {
    return `return true`;
  }

  // Extract all field names and create variable mappings
  const fields = extractFieldNames(condition);
  const varMap: FieldVarMap = new Map();
  const declarations: string[] = [];

  for (const field of fields) {
    const varName = fieldToVarName(field);
    varMap.set(field, varName);
    declarations.push(generateFieldDeclaration(field, varName));
  }

  // declarationsBlock will look like this:
  // def val_field1 = $('field1', null); if (val_field1 instanceof List && val_field1.size() == 1) { val_field1 = val_field1[0]; }
  const declarationsBlock = declarations.length > 0 ? declarations.join('\n  ') + '\n  ' : '';

  return `
  try {
  
  ${declarationsBlock}
  
  if (${conditionToStatement(condition, false, varMap)}) {
    return true;
  }
  return false;
} catch (Exception e) {
  return false;
}
`;
}
