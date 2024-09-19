/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import {
  CustomFieldMetadata,
  IlmPhase,
  PartitionedFieldMetadata,
} from '../../../../../../../../types';
import { FIELD } from '../../../../../../../../translations';
import {
  escapeNewlines,
  getAllowedValues,
  getCodeFormattedValue,
  getMarkdownComment,
  getMarkdownTable,
  getSummaryMarkdownComment,
  getSummaryTableMarkdownComment,
  getTabCountsMarkdownComment,
} from '../../../../../../../../utils/markdown';
import { INDEX_MAPPING_TYPE } from '../translations';
import {
  CUSTOM_CALLOUT,
  CUSTOM_CALLOUT_TITLE,
  CUSTOM_FIELDS_TABLE_TITLE,
  ECS_IS_A_PERMISSIVE_SCHEMA,
} from '../../../../translations';

export const getCustomMarkdownComment = ({
  customFieldMetadata,
}: {
  customFieldMetadata: CustomFieldMetadata[];
}): string =>
  getMarkdownComment({
    suggestedAction: `${CUSTOM_CALLOUT({
      fieldCount: customFieldMetadata.length,
      version: EcsVersion,
    })}

${ECS_IS_A_PERMISSIVE_SCHEMA}
`,
    title: CUSTOM_CALLOUT_TITLE(customFieldMetadata.length),
  });

export const getCustomMarkdownTableRows = (customFieldMetadata: CustomFieldMetadata[]): string =>
  customFieldMetadata
    .map(
      (x) =>
        `| ${escapeNewlines(x.indexFieldName)} | ${getCodeFormattedValue(
          x.indexFieldType
        )} | ${getAllowedValues(undefined)} |`
    )
    .join('\n');

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
  getTabCountsMarkdownComment({
    all: partitionedFieldMetadata.all.length,
    custom: partitionedFieldMetadata.custom.length,
    ecsCompliant: partitionedFieldMetadata.ecsCompliant.length,
    incompatible: partitionedFieldMetadata.incompatible.length,
    sameFamily: partitionedFieldMetadata.sameFamily.length,
  }),
  getCustomMarkdownComment({
    customFieldMetadata: partitionedFieldMetadata.custom,
  }),
  getMarkdownTable({
    enrichedFieldMetadata: partitionedFieldMetadata.custom,
    getMarkdownTableRows: getCustomMarkdownTableRows,
    headerNames: [FIELD, INDEX_MAPPING_TYPE],
    title: CUSTOM_FIELDS_TABLE_TITLE(indexName),
  }),
];
