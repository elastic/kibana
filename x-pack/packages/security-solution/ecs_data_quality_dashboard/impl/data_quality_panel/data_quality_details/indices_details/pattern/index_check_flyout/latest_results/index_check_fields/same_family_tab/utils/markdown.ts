/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import {
  ECS_MAPPING_TYPE_EXPECTED,
  FIELD,
  INDEX_MAPPING_TYPE_ACTUAL,
  SAME_FAMILY_BADGE_LABEL,
} from '../../../../../../../../translations';
import {
  escapeNewlines,
  getCodeFormattedValue,
  getMarkdownComment,
  getMarkdownTable,
  getSummaryMarkdownComment,
  getSummaryTableMarkdownComment,
  getTabCountsMarkdownComment,
} from '../../../../../../../../utils/markdown';
import type {
  IlmPhase,
  PartitionedFieldMetadata,
  SameFamilyFieldMetadata,
} from '../../../../../../../../types';
import {
  FIELDS_WITH_MAPPINGS_SAME_FAMILY,
  SAME_FAMILY_CALLOUT,
  SAME_FAMILY_CALLOUT_TITLE,
  SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE,
} from '../../../../translations';

export const getSameFamilyMarkdownComment = (fieldsInSameFamily: number): string =>
  getMarkdownComment({
    suggestedAction: `${SAME_FAMILY_CALLOUT({
      fieldCount: fieldsInSameFamily,
      version: EcsVersion,
    })}

${FIELDS_WITH_MAPPINGS_SAME_FAMILY}
`,
    title: SAME_FAMILY_CALLOUT_TITLE(fieldsInSameFamily),
  });

export const getSameFamilyMarkdownTableRows = (
  sameFamilyFields: SameFamilyFieldMetadata[]
): string =>
  sameFamilyFields
    .map(
      (x) =>
        `| ${escapeNewlines(x.indexFieldName)} | ${getCodeFormattedValue(
          x.type
        )} | ${getCodeFormattedValue(x.indexFieldType)} ${getCodeFormattedValue(
          SAME_FAMILY_BADGE_LABEL
        )} |`
    )
    .join('\n');

export const getSameFamilyMarkdownTablesComment = ({
  sameFamilyMappings,
  indexName,
}: {
  sameFamilyMappings: SameFamilyFieldMetadata[];
  indexName: string;
}): string => `
${
  sameFamilyMappings.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: sameFamilyMappings,
        getMarkdownTableRows: getSameFamilyMarkdownTableRows,
        headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
        title: SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE(indexName),
      })
    : ''
}
`;

export const getAllSameFamilyMarkdownComments = ({
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
  indexName: string;
  isILMAvailable: boolean;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}): string[] => {
  const sameFamilyMappings = partitionedFieldMetadata.sameFamily;
  const fieldsInSameFamily = sameFamilyMappings.length;

  const sameFamilyMarkdownComment =
    sameFamilyMappings.length > 0 ? getSameFamilyMarkdownComment(fieldsInSameFamily) : '';

  return [
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
      incompatible: partitionedFieldMetadata.incompatible.length,
      sameFamily: fieldsInSameFamily,
      custom: partitionedFieldMetadata.custom.length,
      ecsCompliant: partitionedFieldMetadata.ecsCompliant.length,
      all: partitionedFieldMetadata.all.length,
    }),
    sameFamilyMarkdownComment,
    getSameFamilyMarkdownTablesComment({
      sameFamilyMappings,
      indexName,
    }),
  ].filter((x) => x !== '');
};
