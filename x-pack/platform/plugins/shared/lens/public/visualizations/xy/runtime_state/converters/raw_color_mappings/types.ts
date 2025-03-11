/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYDataLayerConfig, XYState } from '../../../types';

interface DeprecatedColorMappingColorCode {
  type: 'colorCode';
  colorCode: string;
}

interface DeprecatedColorMappingCategoricalColor {
  type: 'categorical';
  paletteId: string;
  colorIndex: number;
}

interface DeprecatedColorMappingGradientColor {
  type: 'gradient';
}

interface DeprecatedColorMappingLoopColor {
  type: 'loop';
}

interface DeprecatedColorMappingRuleAuto {
  type: 'auto';
}
interface DeprecatedColorMappingRuleMatchExactly {
  type: 'matchExactly';
  values: Array<string | string[]>;
}
interface DeprecatedColorMappingRuleMatchExactlyCI {
  type: 'matchExactlyCI';
  values: string[];
}

interface DeprecatedColorMappingRuleRange {
  type: 'range';
  min: number;
  max: number;
  minInclusive: boolean;
  maxInclusive: boolean;
}

interface DeprecatedColorMappingRuleRegExp {
  type: 'regex';
  values: string;
}

interface DeprecatedColorMappingRuleOthers {
  type: 'other';
}

interface DeprecatedColorMappingAssignment<R, C> {
  rule: R;
  color: C;
  touched: boolean;
}

interface DeprecatedColorMappingCategoricalColorMode {
  type: 'categorical';
}

interface DeprecatedColorMappingGradientColorMode {
  type: 'gradient';
  steps: Array<
    (DeprecatedColorMappingCategoricalColor | DeprecatedColorMappingColorCode) & {
      touched: boolean;
    }
  >;
  sort: 'asc' | 'desc';
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated Use `ColorMapping.Config`
 */
export interface DeprecatedColorMappingConfig {
  paletteId: string;
  colorMode: DeprecatedColorMappingCategoricalColorMode | DeprecatedColorMappingGradientColorMode;
  assignments: Array<
    DeprecatedColorMappingAssignment<
      | DeprecatedColorMappingRuleAuto
      | DeprecatedColorMappingRuleMatchExactly
      | DeprecatedColorMappingRuleMatchExactlyCI
      | DeprecatedColorMappingRuleRange
      | DeprecatedColorMappingRuleRegExp,
      | DeprecatedColorMappingCategoricalColor
      | DeprecatedColorMappingColorCode
      | DeprecatedColorMappingGradientColor
    >
  >;
  specialAssignments: Array<
    DeprecatedColorMappingAssignment<
      DeprecatedColorMappingRuleOthers,
      | DeprecatedColorMappingCategoricalColor
      | DeprecatedColorMappingColorCode
      | DeprecatedColorMappingLoopColor
    >
  >;
}

interface DeprecatedColorMappingLayer extends Omit<XYDataLayerConfig, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated Use respective vis state (i.e. `XYState`)
 */
export interface DeprecatedColorMappingsState extends Omit<XYState, 'layers'> {
  layers: Array<DeprecatedColorMappingLayer | XYDataLayerConfig>;
}
