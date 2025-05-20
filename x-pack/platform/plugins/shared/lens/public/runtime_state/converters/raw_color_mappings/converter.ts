/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColorMapping } from '@kbn/coloring';
import { MultiFieldKey, RangeKey, SerializedValue } from '@kbn/data-plugin/common';
import { DeprecatedColorMappingConfig } from './types';
import { ColumnMeta } from './utils';

/**
 * Converts old stringified colorMapping configs to new raw value configs
 */
export function convertToRawColorMappings(
  colorMapping: DeprecatedColorMappingConfig | ColorMapping.Config,
  columnMeta?: ColumnMeta | null
): ColorMapping.Config {
  return {
    ...colorMapping,
    assignments: colorMapping.assignments.map((oldAssignment) => {
      if (isValidColorMappingAssignment(oldAssignment)) return oldAssignment;
      return convertColorMappingAssignment(oldAssignment, columnMeta);
    }),
    specialAssignments: colorMapping.specialAssignments.map((oldAssignment) => {
      if (isValidColorMappingAssignment(oldAssignment)) return oldAssignment;
      return {
        color: oldAssignment.color,
        touched: oldAssignment.touched,
        rules: [oldAssignment.rule],
      };
    }),
  };
}

function convertColorMappingAssignment(
  oldAssignment: DeprecatedColorMappingConfig['assignments'][number],
  columnMeta?: ColumnMeta | null
): ColorMapping.Assignment {
  return {
    color: oldAssignment.color,
    touched: oldAssignment.touched,
    rules: convertColorMappingRule(oldAssignment.rule, columnMeta),
  };
}

const NO_VALUE = Symbol('no-value');

function convertColorMappingRule(
  rule: DeprecatedColorMappingConfig['assignments'][number]['rule'],
  columnMeta?: ColumnMeta | null
): ColorMapping.ColorRule[] {
  switch (rule.type) {
    case 'auto':
      return [];
    case 'matchExactly':
      return rule.values.map((value) => {
        const rawValue = convertToRawValue(value, columnMeta);

        if (rawValue !== NO_VALUE) {
          return {
            type: 'raw',
            value: rawValue,
          };
        }

        return {
          type: 'match',
          pattern: String(value),
          matchEntireWord: true,
          matchCase: true,
        };
      });

    // Rules below not yet used, adding conversions for completeness
    case 'matchExactlyCI':
      return rule.values.map((value) => ({
        type: 'match',
        pattern: Array.isArray(value) ? value.join(' ') : value,
        matchEntireWord: true,
        matchCase: false,
      }));
    case 'regex':
      return [{ type: rule.type, pattern: rule.values }];
    case 'range':
    default:
      return [rule];
  }
}

/**
 * Attempts to convert the previously stringified raw values into their raw/serialized form
 *
 * Note: we use the `NO_VALUE` symbol to avoid collisions with falsy raw values
 */
function convertToRawValue(
  value: string | string[],
  columnMeta?: ColumnMeta | null
): SerializedValue | symbol {
  if (!columnMeta) return NO_VALUE;

  // all array values are multi-term
  if (columnMeta.fieldType === 'multi_terms' || Array.isArray(value)) {
    if (typeof value === 'string') return NO_VALUE; // cannot assume this as multi-field
    return new MultiFieldKey({ key: value }).serialize();
  }

  if (columnMeta.fieldType === 'range') {
    return RangeKey.isRangeKeyString(value) ? RangeKey.fromString(value).serialize() : NO_VALUE;
  }

  switch (columnMeta.dataType) {
    case 'boolean':
      if (value === '__other__' || value === 'true' || value === 'false') return value; // bool could have __other__ as a string
      if (value === '0' || value === '1') return Number(value);
      break;
    case 'number':
    case 'date':
      if (value === '__other__') return value; // numbers can have __other__ as a string
      const numberValue = Number(value);
      if (isFinite(numberValue)) return numberValue;
      break;
    case 'string':
    case 'ip':
      return value; // unable to distinguish manually added values
    default:
      return NO_VALUE; // treat all other other dataType as custom match string values
  }
  return NO_VALUE;
}

function isValidColorMappingAssignment<
  T extends
    | DeprecatedColorMappingConfig['assignments'][number]
    | DeprecatedColorMappingConfig['specialAssignments'][number]
    | ColorMapping.Config['assignments'][number]
    | ColorMapping.Config['specialAssignments'][number]
>(
  assignment: T
): assignment is Exclude<
  T,
  | DeprecatedColorMappingConfig['assignments'][number]
  | DeprecatedColorMappingConfig['specialAssignments'][number]
> {
  return 'rules' in assignment;
}

export function isDeprecatedColorMapping<
  T extends DeprecatedColorMappingConfig | ColorMapping.Config
>(colorMapping?: T): colorMapping is Exclude<T, ColorMapping.Config> {
  if (!colorMapping) return false;
  return Boolean(
    colorMapping.assignments &&
      (colorMapping.assignments.some((assignment) => !isValidColorMappingAssignment(assignment)) ||
        colorMapping.specialAssignments.some(
          (specialAssignment) => !isValidColorMappingAssignment(specialAssignment)
        ))
  );
}
