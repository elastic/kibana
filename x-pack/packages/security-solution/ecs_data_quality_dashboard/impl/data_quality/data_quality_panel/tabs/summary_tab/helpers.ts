/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';

import { getMissingTimestampComment, showMissingTimestampCallout } from '../helpers';
import {
  ALL_TAB_ID,
  ECS_COMPLIANT_TAB_ID,
  CUSTOM_TAB_ID,
  INCOMPATIBLE_TAB_ID,
} from '../../index_properties/helpers';
import {
  getAllIncompatibleMarkdownComments,
  showInvalidCallout,
} from '../incompatible_tab/helpers';
import * as i18n from '../../index_properties/translations';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../types';

export type CategoryId = 'incompatible' | 'custom' | 'ecs-compliant';

interface SummaryData {
  categoryId: CategoryId;
  mappings: number;
}

export const getSummaryData = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): SummaryData[] => [
  { categoryId: 'incompatible', mappings: partitionedFieldMetadata.incompatible.length },
  { categoryId: 'custom', mappings: partitionedFieldMetadata.custom.length },
  { categoryId: 'ecs-compliant', mappings: partitionedFieldMetadata.ecsCompliant.length },
];

export const getFillColor = (categoryId: CategoryId | string): string => {
  switch (categoryId) {
    case 'incompatible':
      return euiThemeVars.euiColorDanger;
    case 'custom':
      return euiThemeVars.euiColorLightShade;
    case 'ecs-compliant':
      return euiThemeVars.euiColorSuccess;
    default:
      return euiThemeVars.euiColorGhost;
  }
};

export const getNodeLabel = (categoryId: CategoryId): string => {
  switch (categoryId) {
    case 'incompatible':
      return i18n.INCOMPATIBLE_FIELDS;
    case 'custom':
      return i18n.CUSTOM_FIELDS;
    case 'ecs-compliant':
      return i18n.ECS_COMPLIANT_FIELDS;
    default:
      return i18n.UNKNOWN;
  }
};

export const getTabId = (groupByField: string): string => {
  switch (groupByField) {
    case 'incompatible':
      return INCOMPATIBLE_TAB_ID;
    case 'custom':
      return CUSTOM_TAB_ID;
    case 'ecs-compliant':
      return ECS_COMPLIANT_TAB_ID;
    default:
      return ALL_TAB_ID;
  }
};

const isString = (x: string | null): x is string => typeof x === 'string';

export const getMarkdownComments = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  pattern: string;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}): string[] => {
  const invalidMarkdownComments = showInvalidCallout(partitionedFieldMetadata.incompatible)
    ? getAllIncompatibleMarkdownComments({
        docsCount,
        formatBytes,
        formatNumber,
        ilmPhase,
        indexName,
        partitionedFieldMetadata,
        patternDocsCount,
        sizeInBytes,
      })
    : [];

  const showMissingTimestampComment = showMissingTimestampCallout(
    partitionedFieldMetadata.ecsCompliant
  )
    ? getMissingTimestampComment()
    : null;

  return [...invalidMarkdownComments, showMissingTimestampComment].filter(isString);
};
