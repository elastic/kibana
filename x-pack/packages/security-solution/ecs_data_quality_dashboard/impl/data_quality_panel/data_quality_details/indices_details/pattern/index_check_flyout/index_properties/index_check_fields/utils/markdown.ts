/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INCOMPATIBLE_FIELDS } from '../../../../../../../translations';
import {
  escapeNewlines,
  getCodeFormattedValue,
  getMarkdownTableHeader,
  getSummaryTableMarkdownHeader,
  getSummaryTableMarkdownRow,
} from '../../../../../../../utils/markdown';
import {
  AllowedValue,
  CustomFieldMetadata,
  EcsBasedFieldMetadata,
  EnrichedFieldMetadata,
  IlmPhase,
  PartitionedFieldMetadata,
  UnallowedValueCount,
} from '../../../../../../../types';
import { ALL_FIELDS, CUSTOM_FIELDS, ECS_COMPLIANT_FIELDS, SAME_FAMILY } from '../../translations';
import { SAME_FAMILY_BADGE_LABEL } from '../translate';

export const getSummaryTableMarkdownComment = ({
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
}): string =>
  `${getSummaryTableMarkdownHeader(isILMAvailable)}
${getSummaryTableMarkdownRow({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  isILMAvailable,
  incompatible: partitionedFieldMetadata.incompatible.length,
  patternDocsCount,
  sizeInBytes,
})}
`;

export const escapePreserveNewlines = (content: string | undefined): string | undefined =>
  content != null ? content.replaceAll('|', '\\|') : content;

export const getAllowedValues = (allowedValues: AllowedValue[] | undefined): string =>
  allowedValues == null
    ? getCodeFormattedValue(undefined)
    : allowedValues.map((x) => getCodeFormattedValue(x.name)).join(', ');

export const getIndexInvalidValues = (indexInvalidValues: UnallowedValueCount[]): string =>
  indexInvalidValues.length === 0
    ? getCodeFormattedValue(undefined)
    : indexInvalidValues
        .map(
          ({ fieldName, count }) => `${getCodeFormattedValue(escapeNewlines(fieldName))} (${count})`
        )
        .join(', '); // newlines are instead joined with spaces

export const getCustomMarkdownTableRows = (customFieldMetadata: CustomFieldMetadata[]): string =>
  customFieldMetadata
    .map(
      (x) =>
        `| ${escapeNewlines(x.indexFieldName)} | ${getCodeFormattedValue(
          x.indexFieldType
        )} | ${getAllowedValues(undefined)} |`
    )
    .join('\n');

export const getSameFamilyBadge = (ecsBasedFieldMetadata: EcsBasedFieldMetadata): string =>
  ecsBasedFieldMetadata.isInSameFamily ? getCodeFormattedValue(SAME_FAMILY_BADGE_LABEL) : '';

export const getIncompatibleMappingsMarkdownTableRows = (
  incompatibleMappings: EcsBasedFieldMetadata[]
): string =>
  incompatibleMappings
    .map(
      (x) =>
        `| ${escapeNewlines(x.indexFieldName)} | ${getCodeFormattedValue(
          x.type
        )} | ${getCodeFormattedValue(x.indexFieldType)} ${getSameFamilyBadge(x)} |`
    )
    .join('\n');

export const getIncompatibleValuesMarkdownTableRows = (
  incompatibleValues: EcsBasedFieldMetadata[]
): string =>
  incompatibleValues
    .map(
      (x) =>
        `| ${escapeNewlines(x.indexFieldName)} | ${getAllowedValues(
          x.allowed_values
        )} | ${getIndexInvalidValues(x.indexInvalidValues)} |`
    )
    .join('\n');

export const getMarkdownComment = ({
  suggestedAction,
  title,
}: {
  suggestedAction: string;
  title: string;
}): string =>
  `#### ${escapeNewlines(title)}

${escapePreserveNewlines(suggestedAction)}`;

export const getMarkdownTable = <T extends EnrichedFieldMetadata[]>({
  enrichedFieldMetadata,
  getMarkdownTableRows,
  headerNames,
  title,
}: {
  enrichedFieldMetadata: T;
  getMarkdownTableRows: (enrichedFieldMetadata: T) => string;
  headerNames: string[];
  title: string;
}): string =>
  enrichedFieldMetadata.length > 0
    ? `#### ${escapeNewlines(title)}

${getMarkdownTableHeader(headerNames)}
${getMarkdownTableRows(enrichedFieldMetadata)}
`
    : '';

export const getSummaryMarkdownComment = (indexName: string) =>
  `### ${escapeNewlines(indexName)}
`;

export const getTabCountsMarkdownComment = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): string =>
  `### **${INCOMPATIBLE_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.incompatible.length}`
  )} **${SAME_FAMILY}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.sameFamily.length}`
  )} **${CUSTOM_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.custom.length}`
  )} **${ECS_COMPLIANT_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.ecsCompliant.length}`
  )} **${ALL_FIELDS}** ${getCodeFormattedValue(`${partitionedFieldMetadata.all.length}`)}
`;
