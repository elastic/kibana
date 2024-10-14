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
} from '../../../../../../translations';
import {
  escapeNewlines,
  getCodeFormattedValue,
  getMarkdownComment,
  getMarkdownTable,
  getSummaryMarkdownComment,
  getSummaryTableMarkdownComment,
  getTabCountsMarkdownComment,
} from '../../../../../../utils/markdown';
import type { IlmPhase, SameFamilyFieldMetadata } from '../../../../../../types';
import {
  FIELDS_WITH_MAPPINGS_SAME_FAMILY,
  SAME_FAMILY_CALLOUT,
  SAME_FAMILY_CALLOUT_TITLE,
  SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE,
} from '../../translations';

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
  sameFamilyFields,
  indexName,
}: {
  sameFamilyFields: SameFamilyFieldMetadata[];
  indexName: string;
}): string => `
${
  sameFamilyFields.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: sameFamilyFields,
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
  sameFamilyFields,
  incompatibleFieldsCount,
  customFieldsCount,
  ecsCompliantFieldsCount,
  allFieldsCount,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  isILMAvailable: boolean;
  sameFamilyFields: SameFamilyFieldMetadata[];
  incompatibleFieldsCount: number;
  customFieldsCount: number;
  ecsCompliantFieldsCount: number;
  allFieldsCount: number;
  patternDocsCount?: number;
  sizeInBytes: number | undefined;
}): string[] => {
  const sameFamilyMarkdownComment =
    sameFamilyFields.length > 0 ? getSameFamilyMarkdownComment(sameFamilyFields.length) : '';

  return [
    getSummaryMarkdownComment(indexName),
    getSummaryTableMarkdownComment({
      docsCount,
      formatBytes,
      formatNumber,
      ilmPhase,
      indexName,
      isILMAvailable,
      incompatibleFieldsCount,
      patternDocsCount,
      sizeInBytes,
    }),
    getTabCountsMarkdownComment({
      incompatibleFieldsCount,
      sameFamilyFieldsCount: sameFamilyFields.length,
      customFieldsCount,
      ecsCompliantFieldsCount,
      allFieldsCount,
    }),
    sameFamilyMarkdownComment,
    getSameFamilyMarkdownTablesComment({
      sameFamilyFields,
      indexName,
    }),
  ].filter((x) => x !== '');
};
