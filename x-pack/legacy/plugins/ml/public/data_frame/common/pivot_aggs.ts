/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../common/types/common';
import { KBN_FIELD_TYPES } from '../../../common/constants/field_types';

import { AggName } from './aggregations';
import { FieldName } from './fields';

export enum PIVOT_SUPPORTED_AGGS {
  AVG = 'avg',
  CARDINALITY = 'cardinality',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  COUNT = 'count',
}

type PIVOT_SUPPORT_AGG_WITH_FIELD =
  | PIVOT_SUPPORTED_AGGS.AVG
  | PIVOT_SUPPORTED_AGGS.CARDINALITY
  | PIVOT_SUPPORTED_AGGS.MAX
  | PIVOT_SUPPORTED_AGGS.MIN
  | PIVOT_SUPPORTED_AGGS.SUM;

export const pivotSupportedAggs: PIVOT_SUPPORTED_AGGS[] = [
  PIVOT_SUPPORTED_AGGS.AVG,
  PIVOT_SUPPORTED_AGGS.CARDINALITY,
  PIVOT_SUPPORTED_AGGS.MAX,
  PIVOT_SUPPORTED_AGGS.MIN,
  PIVOT_SUPPORTED_AGGS.SUM,
  PIVOT_SUPPORTED_AGGS.COUNT,
];

export const pivotAggsFieldSupport = {
  [KBN_FIELD_TYPES.ATTACHMENT]: [],
  [KBN_FIELD_TYPES.BOOLEAN]: [],
  [KBN_FIELD_TYPES.DATE]: [PIVOT_SUPPORTED_AGGS.MAX, PIVOT_SUPPORTED_AGGS.MIN],
  [KBN_FIELD_TYPES.GEO_POINT]: [],
  [KBN_FIELD_TYPES.GEO_SHAPE]: [],
  [KBN_FIELD_TYPES.IP]: [PIVOT_SUPPORTED_AGGS.CARDINALITY],
  [KBN_FIELD_TYPES.MURMUR3]: [],
  [KBN_FIELD_TYPES.NUMBER]: [
    PIVOT_SUPPORTED_AGGS.AVG,
    PIVOT_SUPPORTED_AGGS.CARDINALITY,
    PIVOT_SUPPORTED_AGGS.MAX,
    PIVOT_SUPPORTED_AGGS.MIN,
    PIVOT_SUPPORTED_AGGS.SUM,
  ],
  [KBN_FIELD_TYPES.STRING]: [PIVOT_SUPPORTED_AGGS.CARDINALITY],
  [KBN_FIELD_TYPES._SOURCE]: [],
  [KBN_FIELD_TYPES.UNKNOWN]: [],
  [KBN_FIELD_TYPES.CONFLICT]: [],
};

export interface PivotAggCount {
  [PIVOT_SUPPORTED_AGGS.COUNT]: {};
}
export type PivotAggField = {
  [key in PIVOT_SUPPORT_AGG_WITH_FIELD]?: {
    field: FieldName;
  }
};

export type PivotAgg = PivotAggCount | PivotAggField;

export type PivotAggDict = { [key in AggName]: PivotAgg };

// The internal representation of an aggregation definition.
export interface PivotAggsConfigBase {
  agg: PIVOT_SUPPORTED_AGGS;
  aggName: AggName;
  dropDownName: string;
}

export interface PivotAggsConfigWithUiSupport extends PivotAggsConfigBase {
  field: FieldName;
}

export function isPivotAggsConfigWithUiSupport(arg: any): arg is PivotAggsConfigWithUiSupport {
  return (
    arg.hasOwnProperty('agg') &&
    arg.hasOwnProperty('aggName') &&
    arg.hasOwnProperty('dropDownName') &&
    arg.hasOwnProperty('field') &&
    pivotSupportedAggs.includes(arg.agg)
  );
}

export type PivotAggsConfig = PivotAggsConfigBase | PivotAggsConfigWithUiSupport;

export type PivotAggsConfigWithUiSupportDict = Dictionary<PivotAggsConfigWithUiSupport>;
export type PivotAggsConfigDict = Dictionary<PivotAggsConfig>;

export function getEsAggFromAggConfig(groupByConfig: PivotAggsConfigBase): PivotAgg {
  const esAgg = { ...groupByConfig };

  delete esAgg.agg;
  delete esAgg.aggName;
  delete esAgg.dropDownName;

  return {
    [groupByConfig.agg]: esAgg,
  };
}
