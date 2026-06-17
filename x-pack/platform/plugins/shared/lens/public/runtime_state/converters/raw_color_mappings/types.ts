/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @deprecated */
interface DeprecatedColorMappingColorCode {
  type: 'colorCode';
  colorCode: string;
}

/** @deprecated */
interface DeprecatedColorMappingCategoricalColor {
  type: 'categorical';
  paletteId: string;
  colorIndex: number;
}

/** @deprecated */
interface DeprecatedColorMappingGradientColor {
  type: 'gradient';
}

/** @deprecated */
interface DeprecatedColorMappingLoopColor {
  type: 'loop';
}

/** @deprecated */
interface DeprecatedColorMappingRuleAuto {
  type: 'auto';
}
/** @deprecated */
interface DeprecatedColorMappingRuleMatchExactly {
  type: 'matchExactly';
  values: Array<string | string[]>;
}
/** @deprecated */
interface DeprecatedColorMappingRuleMatchExactlyCI {
  type: 'matchExactlyCI';
  values: string[];
}

/** @deprecated */
interface DeprecatedColorMappingRuleRange {
  type: 'range';
  min: number;
  max: number;
  minInclusive: boolean;
  maxInclusive: boolean;
}

/** @deprecated */
interface DeprecatedColorMappingRuleRegExp {
  type: 'regex';
  values: string;
}

/** @deprecated */
interface DeprecatedColorMappingRuleOthers {
  type: 'other';
}

/** @deprecated */
interface DeprecatedColorMappingAssignment<R, C> {
  rule: R;
  color: C;
  touched: boolean;
}

/** @deprecated */
interface DeprecatedColorMappingCategoricalColorMode {
  type: 'categorical';
}

/** @deprecated */
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
