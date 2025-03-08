/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColorMapping } from '@kbn/coloring';
import { MultiFieldKey, RangeKey, SerializedValue } from '@kbn/data-plugin/common';
import { XYDataLayerConfig, XYState } from '../../types';
import { DatasourceLayers, OperationDescriptor } from '../../../../types';

interface ColorCode {
  type: 'colorCode';
  colorCode: string;
}

interface CategoricalColor {
  type: 'categorical';
  paletteId: string;
  colorIndex: number;
}

interface GradientColor {
  type: 'gradient';
}

interface LoopColor {
  type: 'loop';
}

interface RuleAuto {
  type: 'auto';
}
interface RuleMatchExactly {
  type: 'matchExactly';
  values: Array<string | string[]>;
}
interface RuleMatchExactlyCI {
  type: 'matchExactlyCI';
  values: string[];
}

interface RuleRange {
  type: 'range';
  min: number;
  max: number;
  minInclusive: boolean;
  maxInclusive: boolean;
}

interface RuleRegExp {
  type: 'regex';
  values: string;
}

interface RuleOthers {
  type: 'other';
}

interface Assignment<R, C> {
  rule: R;
  color: C;
  touched: boolean;
}

interface CategoricalColorMode {
  type: 'categorical';
}
interface GradientColorMode {
  type: 'gradient';
  steps: Array<(CategoricalColor | ColorCode) & { touched: boolean }>;
  sort: 'asc' | 'desc';
}

interface Config {
  paletteId: string;
  colorMode: CategoricalColorMode | GradientColorMode;
  assignments: Array<
    Assignment<
      RuleAuto | RuleMatchExactly | RuleMatchExactlyCI | RuleRange | RuleRegExp,
      CategoricalColor | ColorCode | GradientColor
    >
  >;
  specialAssignments: Array<Assignment<RuleOthers, CategoricalColor | ColorCode | LoopColor>>;
}

interface OldXYMappingLayer extends Omit<XYDataLayerConfig, 'colorMapping'> {
  colorMapping: Config;
}

interface OldState extends Omit<XYState, 'layers'> {
  layers: Array<OldXYMappingLayer | XYDataLayerConfig>;
}

export const convertToRawColorMappingsFn =
  (datasourceLayers: DatasourceLayers) =>
  (state: OldState | XYState): XYState => {
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
          ? datasourceLayers[layer.layerId]?.getOperationForColumnId(accessor)
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
  oldAssignment: Config['assignments'][number],
  column?: OperationDescriptor | null
): ColorMapping.Assignment {
  return {
    color: oldAssignment.color,
    touched: oldAssignment.touched,
    rules: convertColorMappingRule(oldAssignment.rule, column),
  };
}

const NO_VALUE = Symbol('no-value');
export function convertColorMappingRule(
  rule: Config['assignments'][number]['rule'],
  column?: OperationDescriptor | null
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
          pattern: String(value), // should not be an array at this point
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
  column?: OperationDescriptor | null
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
