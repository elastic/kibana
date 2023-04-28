/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@kbn/ecs';
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
import type { EnrichedFieldMetadata, IlmPhase, PartitionedFieldMetadata } from '../../../types';

export const getCustomMarkdownComment = ({
  enrichedFieldMetadata,
}: {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
}): string =>
  getMarkdownComment({
    suggestedAction: `${i18n.CUSTOM_CALLOUT({
      fieldCount: enrichedFieldMetadata.length,
      version: EcsVersion,
    })}

${i18n.ECS_IS_A_PERMISSIVE_SCHEMA}
`,
    title: i18n.CUSTOM_CALLOUT_TITLE(enrichedFieldMetadata.length),
  });

export const showCustomCallout = (enrichedFieldMetadata: EnrichedFieldMetadata[]): boolean =>
  enrichedFieldMetadata.length > 0;

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
    partitionedFieldMetadata,
    patternDocsCount,
    sizeInBytes,
  }),
  getTabCountsMarkdownComment(partitionedFieldMetadata),
  getCustomMarkdownComment({
    enrichedFieldMetadata: partitionedFieldMetadata.custom,
  }),
  getMarkdownTable({
    enrichedFieldMetadata: partitionedFieldMetadata.custom,
    getMarkdownTableRows: getCustomMarkdownTableRows,
    headerNames: [FIELD, INDEX_MAPPING_TYPE],
    title: i18n.CUSTOM_FIELDS_TABLE_TITLE(indexName),
  }),
];
