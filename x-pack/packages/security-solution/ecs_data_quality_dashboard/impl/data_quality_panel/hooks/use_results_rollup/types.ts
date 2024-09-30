/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IlmPhase,
  IncompatibleFieldMappingItem,
  IncompatibleFieldValueItem,
  OnCheckCompleted,
  PatternRollup,
  SameFamilyFieldItem,
} from '../../types';

export interface UseResultsRollupReturnValue {
  onCheckCompleted: OnCheckCompleted;
  patternIndexNames: Record<string, string[]>;
  patternRollups: Record<string, PatternRollup>;
  totalDocsCount: number | undefined;
  totalIncompatible: number | undefined;
  totalIndices: number | undefined;
  totalIndicesChecked: number | undefined;
  totalSameFamily: number | undefined;
  totalSizeInBytes: number | undefined;
  updatePatternIndexNames: ({
    indexNames,
    pattern,
  }: {
    indexNames: string[];
    pattern: string;
  }) => void;
  updatePatternRollup: (patternRollup: PatternRollup) => void;
}

export interface StorageResult {
  batchId: string;
  indexName: string;
  indexPattern: string;
  isCheckAll: boolean;
  checkedAt: number;
  docsCount: number;
  totalFieldCount: number;
  ecsFieldCount: number;
  customFieldCount: number;
  incompatibleFieldCount: number;
  incompatibleFieldMappingItems: IncompatibleFieldMappingItem[];
  incompatibleFieldValueItems: IncompatibleFieldValueItem[];
  sameFamilyFieldCount: number;
  sameFamilyFields: string[];
  sameFamilyFieldItems: SameFamilyFieldItem[];
  unallowedMappingFields: string[];
  unallowedValueFields: string[];
  sizeInBytes: number;
  ilmPhase?: IlmPhase;
  markdownComments: string[];
  ecsVersion: string;
  indexId: string;
  error: string | null;
}
