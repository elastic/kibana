/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { euiThemeVars } from '@kbn/ui-theme';

import { FIELD, INDEX_MAPPING_TYPE } from '../../../compare_fields_table/translations';
import {
  getSummaryMarkdownComment,
  getCustomMarkdownTableRows,
  getMarkdownComment,
  getMarkdownTable,
  getTabCountsMarkdownComment,
  getSummaryTableMarkdownComment,
} from '../../index_properties/markdown/helpers';
import * as i18n from '../../index_properties/translations';
import { getFillColor } from '../summary_tab/helpers';
import type { CustomFieldMetadata, IlmPhase, PartitionedFieldMetadata } from '../../../types';

export const getCustomMarkdownComment = ({
  customFieldMetadata,
}: {
  customFieldMetadata: CustomFieldMetadata[];
}): string =>
  getMarkdownComment({
    suggestedAction: `${i18n.CUSTOM_CALLOUT({
      fieldCount: customFieldMetadata.length,
      version: EcsVersion,
    })}

${i18n.ECS_IS_A_PERMISSIVE_SCHEMA}
`,
    title: i18n.CUSTOM_CALLOUT_TITLE(customFieldMetadata.length),
  });

export const showCustomCallout = (customFieldMetadata: CustomFieldMetadata[]): boolean =>
  customFieldMetadata.length > 0;

export const getCustomColor = (partitionedFieldMetadata: PartitionedFieldMetadata): string =>
  showCustomCallout(partitionedFieldMetadata.custom)
    ? getFillColor('custom')
    : euiThemeVars.euiTextColor;

export const getAllCustomMarkdownComments = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  isILMAvailable,
  partitionedFieldMetadata,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  isILMAvailable: boolean;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}): string[] => [
  getSummaryMarkdownComment(indexName),
  getSummaryTableMarkdownComment({
    docsCount,
    formatBytes,
    formatNumber,
    ilmPhase,
    indexName,
    isILMAvailable,
    partitionedFieldMetadata,
    patternDocsCount,
    sizeInBytes,
  }),
  getTabCountsMarkdownComment(partitionedFieldMetadata),
  getCustomMarkdownComment({
    customFieldMetadata: partitionedFieldMetadata.custom,
  }),
  getMarkdownTable({
    enrichedFieldMetadata: partitionedFieldMetadata.custom,
    getMarkdownTableRows: getCustomMarkdownTableRows,
    headerNames: [FIELD, INDEX_MAPPING_TYPE],
    title: i18n.CUSTOM_FIELDS_TABLE_TITLE(indexName),
  }),
];
