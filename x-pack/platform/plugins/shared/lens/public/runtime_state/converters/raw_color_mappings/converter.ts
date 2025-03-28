/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColorMapping } from '@kbn/coloring';
import { MultiFieldKey, RangeKey, SerializedValue } from '@kbn/data-plugin/common';
import { DeprecatedColorMappingConfig } from './types';
import { GenericIndexPatternColumn } from '../../../async_services';

/**
 * Converts old stringified colorMapping configs to new raw value configs
 */
export function convertToRawColorMappings(
  colorMapping: DeprecatedColorMappingConfig | ColorMapping.Config,
  column?: Partial<GenericIndexPatternColumn> | null
): ColorMapping.Config {
  return {
    ...colorMapping,
    assignments: colorMapping.assignments.map((oldAssignment) => {
      if (isValidColorMappingAssignment(oldAssignment)) return oldAssignment;
      return convertColorMappingAssignment(oldAssignment, column);
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
  column?: Partial<GenericIndexPatternColumn> | null
): ColorMapping.Assignment {
  return {
    color: oldAssignment.color,
    touched: oldAssignment.touched,
    rules: convertColorMappingRule(oldAssignment.rule, column),
  };
}

const NO_VALUE = Symbol('no-value');

function convertColorMappingRule(
  rule: DeprecatedColorMappingConfig['assignments'][number]['rule'],
  column?: Partial<GenericIndexPatternColumn> | null
): ColorMapping.ColorRule[] {
  switch (rule.type) {
    case 'auto':
      return [];
    case 'matchExactly':
      return rule.values.map((value) => {
        const rawValue = convertToRawValue(value, column);

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

const getParentFormatId = (column: Partial<GenericIndexPatternColumn>) =>
  'params' in column
    ? (column.params as { parentFormat?: { id?: string } })?.parentFormat?.id
    : undefined;

/**
 * Attempts to convert the previously stringified raw values into their raw/serialized form
 *
 * Note: we use the `NO_VALUE` symbol to avoid collisions with falsy raw values
 */
function convertToRawValue(
  value: string | string[],
  column?: Partial<GenericIndexPatternColumn> | null
): SerializedValue | symbol {
  if (!column) return NO_VALUE;

  const { dataType } = column;
  const type = getParentFormatId(column);

  // all array values are multi-term
  if (type === 'multi_terms' || Array.isArray(value)) {
    if (typeof value === 'string') return NO_VALUE;
    return new MultiFieldKey({ key: value }).serialize();
  }

  if (type === 'range') {
    return RangeKey.isRangeKeyString(value) ? RangeKey.fromString(value).serialize() : NO_VALUE;
  }

  switch (dataType) {
    case 'number':
    case 'boolean':
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
