/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColorMapping } from '@kbn/coloring';
import { MultiFieldKey, RangeKey, SerializedValue } from '@kbn/data-plugin/common';
import { XYDataLayerConfig, XYState } from '../../../types';
import { DeprecatedColorMappingConfig, DeprecatedColorMappingsState } from './types';
import {
  FormBasedPersistedState,
  GenericIndexPatternColumn,
} from '../../../../../datasources/form_based/types';

export const convertToRawColorMappingsFn =
  (datasourceState?: FormBasedPersistedState) =>
  (state: DeprecatedColorMappingsState | XYState): XYState => {
    const hasLayersToConvert = state.layers.some((layer) => {
      return (
        layer.layerType === 'data' &&
        layer.colorMapping?.assignments &&
        (layer.colorMapping.assignments.some((assignment) => 'rule' in assignment) ||
          layer.colorMapping.specialAssignments.some(
            (specialAssignment) => 'rule' in specialAssignment
          ))
      );
    });

    if (!hasLayersToConvert) return state as XYState;

    const convertedLayers = state.layers.map((layer) => {
      if (
        layer.layerType === 'data' &&
        (layer.colorMapping?.assignments || layer.colorMapping?.specialAssignments)
      ) {
        const accessor = layer.splitAccessor;
        const column = accessor
          ? datasourceState?.layers?.[layer.layerId]?.columns?.[accessor]
          : null;

        return {
          ...layer,
          colorMapping: {
            ...layer.colorMapping,
            assignments: layer.colorMapping.assignments.map((oldAssignment) => {
              if (!('rule' in oldAssignment)) return oldAssignment;
              return convertColorMappingAssignment(oldAssignment, column);
            }),
            specialAssignments: layer.colorMapping.specialAssignments.map((oldAssignment) => {
              if (!('rule' in oldAssignment)) return oldAssignment;
              return {
                color: oldAssignment.color,
                touched: oldAssignment.touched,
                rules: [oldAssignment.rule],
              };
            }),
          },
        } satisfies XYDataLayerConfig;
      }

      return layer as XYDataLayerConfig;
    });

    return {
      ...state,
      layers: convertedLayers,
    };
  };

export function convertColorMappingAssignment(
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

export function convertColorMappingRule(
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

/**
 * Attempts to convert the previously stringified raw values into their raw/serialized form
 *
 * Note: we use the `NO_VALUE` symbol to avoid collisions with falsy raw values
 */
export function convertToRawValue(
  value: string | string[],
  column?: Partial<GenericIndexPatternColumn> | null
): SerializedValue | symbol {
  if (!column) return NO_VALUE;

  const { dataType, params } = column;
  const type = (params as { parentFormat?: { id?: string } })?.parentFormat?.id;

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
