/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { EMPTY_PLACEHOLDER, EMPTY_STAT } from '../constants';
import {
  ALL_FIELDS,
  CUSTOM_FIELDS,
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  DOCS,
  DOCUMENT_VALUES_ACTUAL,
  ECS_COMPLIANT_FIELDS,
  ECS_MAPPING_TYPE_EXPECTED,
  ECS_VALUES_EXPECTED,
  FIELD,
  ILM_PHASE,
  ILM_PHASE_CAPITALIZED,
  INCOMPATIBLE_CALLOUT,
  INCOMPATIBLE_CALLOUT_TITLE,
  INCOMPATIBLE_FIELDS,
  INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE,
  INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE,
  INDEX,
  INDEX_MAPPING_TYPE_ACTUAL,
  INDICES,
  INDICES_CHECKED,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
  RESULT,
  SAME_FAMILY,
  SAME_FAMILY_BADGE_LABEL,
  SIZE,
} from '../translations';
import {
  AllowedValue,
  EcsBasedFieldMetadata,
  EnrichedFieldMetadata,
  IlmPhase,
  PartitionedFieldMetadata,
  UnallowedValueCount,
} from '../types';
import { getIsInSameFamily } from './get_is_in_same_family';
import { getDocsCountPercent } from './stats';

export const escapeNewlines = (content: string | undefined): string | undefined =>
  content != null ? content.replaceAll('\n', ' ').replaceAll('|', '\\|') : content;

export const getCodeFormattedValue = (value: string | undefined) =>
  `\`${escapeNewlines(value ?? EMPTY_PLACEHOLDER)}\``;

export const getHeaderSeparator = (headerText: string): string => '-'.repeat(headerText.length + 2); // 2 extra, for the spaces on both sides of the column name

export const getStatsRollupMarkdownComment = ({
  docsCount,
  formatBytes,
  formatNumber,
  incompatible,
  indices,
  indicesChecked,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  incompatible: number | undefined;
  indices: number | undefined;
  indicesChecked: number | undefined;
  sizeInBytes: number | undefined;
}): string =>
  Number.isInteger(sizeInBytes)
    ? `| ${INCOMPATIBLE_FIELDS} | ${INDICES_CHECKED} | ${INDICES} | ${SIZE} | ${DOCS} |
|${getHeaderSeparator(INCOMPATIBLE_FIELDS)}|${getHeaderSeparator(
        INDICES_CHECKED
      )}|${getHeaderSeparator(INDICES)}|${getHeaderSeparator(SIZE)}|${getHeaderSeparator(DOCS)}|
| ${incompatible ?? EMPTY_STAT} | ${indicesChecked ?? EMPTY_STAT} | ${
        indices ?? EMPTY_STAT
      } | ${formatBytes(sizeInBytes)} | ${formatNumber(docsCount)} |
`
    : `| ${INCOMPATIBLE_FIELDS} | ${INDICES_CHECKED} | ${INDICES} | ${DOCS} |
|${getHeaderSeparator(INCOMPATIBLE_FIELDS)}|${getHeaderSeparator(
        INDICES_CHECKED
      )}|${getHeaderSeparator(INDICES)}|${getHeaderSeparator(DOCS)}|
| ${incompatible ?? EMPTY_STAT} | ${indicesChecked ?? EMPTY_STAT} | ${
        indices ?? EMPTY_STAT
      } | ${formatNumber(docsCount)} |
`;

export const getSummaryTableMarkdownHeader = (includeDocSize: boolean): string =>
  includeDocSize
    ? `| ${RESULT} | ${INDEX} | ${DOCS} | ${INCOMPATIBLE_FIELDS} | ${ILM_PHASE_CAPITALIZED} | ${SIZE} |
|${getHeaderSeparator(RESULT)}|${getHeaderSeparator(INDEX)}|${getHeaderSeparator(
        DOCS
      )}|${getHeaderSeparator(INCOMPATIBLE_FIELDS)}|${getHeaderSeparator(
        ILM_PHASE
      )}|${getHeaderSeparator(SIZE)}|`
    : `| ${RESULT} | ${INDEX} | ${DOCS} | ${INCOMPATIBLE_FIELDS} |
|${getHeaderSeparator(RESULT)}|${getHeaderSeparator(INDEX)}|${getHeaderSeparator(
        DOCS
      )}|${getHeaderSeparator(INCOMPATIBLE_FIELDS)}|`;

export const getResultEmoji = (incompatible: number | undefined): string => {
  if (incompatible == null) {
    return EMPTY_PLACEHOLDER;
  } else {
    return incompatible === 0 ? '✅' : '❌';
  }
};

export const getSummaryTableMarkdownRow = ({
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  incompatible,
  indexName,
  isILMAvailable,
  patternDocsCount,
  sizeInBytes,
}: {
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  incompatible: number | undefined;
  indexName: string;
  isILMAvailable: boolean;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}): string =>
  isILMAvailable && Number.isInteger(sizeInBytes)
    ? `| ${getResultEmoji(incompatible)} | ${escapeNewlines(indexName)} | ${formatNumber(
        docsCount
      )} (${getDocsCountPercent({
        docsCount,
        patternDocsCount,
      })}) | ${incompatible ?? EMPTY_PLACEHOLDER} | ${
        ilmPhase != null ? getCodeFormattedValue(ilmPhase) : EMPTY_PLACEHOLDER
      } | ${formatBytes(sizeInBytes)} |
`
    : `| ${getResultEmoji(incompatible)} | ${escapeNewlines(indexName)} | ${formatNumber(
        docsCount
      )} (${getDocsCountPercent({
        docsCount,
        patternDocsCount,
      })}) | ${incompatible ?? EMPTY_PLACEHOLDER} |
`;

export const getMarkdownTableHeader = (headerNames: string[]) => `
| ${headerNames.map((name) => `${escapeNewlines(name)} | `).join('')}
|${headerNames.map((name) => `${getHeaderSeparator(name)}|`).join('')}`;

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

export const getIncompatibleMappings = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): EcsBasedFieldMetadata[] =>
  ecsBasedFieldMetadata.filter(
    (x) =>
      !x.isEcsCompliant &&
      x.type !== x.indexFieldType &&
      !getIsInSameFamily({ ecsExpectedType: x.type, type: x.indexFieldType })
  );

export const getIncompatibleValues = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): EcsBasedFieldMetadata[] =>
  ecsBasedFieldMetadata.filter((x) => !x.isEcsCompliant && x.indexInvalidValues.length > 0);

export const getIncompatibleFieldsMarkdownComment = (incompatible: number): string =>
  getMarkdownComment({
    suggestedAction: `${INCOMPATIBLE_CALLOUT(EcsVersion)}

${DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${PAGES_MAY_NOT_DISPLAY_EVENTS}
${MAPPINGS_THAT_CONFLICT_WITH_ECS}
`,
    title: INCOMPATIBLE_CALLOUT_TITLE(incompatible),
  });

export const escapePreserveNewlines = (content: string | undefined): string | undefined =>
  content != null ? content.replaceAll('|', '\\|') : content;

export const getIndexInvalidValues = (indexInvalidValues: UnallowedValueCount[]): string =>
  indexInvalidValues.length === 0
    ? getCodeFormattedValue(undefined)
    : indexInvalidValues
        .map(
          ({ fieldName, count }) => `${getCodeFormattedValue(escapeNewlines(fieldName))} (${count})`
        )
        .join(', '); // newlines are instead joined with spaces

export const getAllowedValues = (allowedValues: AllowedValue[] | undefined): string =>
  allowedValues == null
    ? getCodeFormattedValue(undefined)
    : allowedValues.map((x) => getCodeFormattedValue(x.name)).join(', ');

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

export const getIncompatibleFieldsMarkdownTablesComment = ({
  incompatibleMappings,
  incompatibleValues,
  indexName,
}: {
  incompatibleMappings: EcsBasedFieldMetadata[];
  incompatibleValues: EcsBasedFieldMetadata[];
  indexName: string;
}): string => `
${
  incompatibleMappings.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: incompatibleMappings,
        getMarkdownTableRows: getIncompatibleMappingsMarkdownTableRows,
        headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
        title: INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName),
      })
    : ''
}
${
  incompatibleValues.length > 0
    ? getMarkdownTable({
        enrichedFieldMetadata: incompatibleValues,
        getMarkdownTableRows: getIncompatibleValuesMarkdownTableRows,
        headerNames: [FIELD, ECS_VALUES_EXPECTED, DOCUMENT_VALUES_ACTUAL],
        title: INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE(indexName),
      })
    : ''
}
`;

export const getAllIncompatibleMarkdownComments = ({
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
  const incompatibleMappings = getIncompatibleMappings(partitionedFieldMetadata.incompatible);
  const incompatibleValues = getIncompatibleValues(partitionedFieldMetadata.incompatible);

  const incompatibleFieldsMarkdownComment =
    partitionedFieldMetadata.incompatible.length > 0
      ? getIncompatibleFieldsMarkdownComment(partitionedFieldMetadata.incompatible.length)
      : '';

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
    getTabCountsMarkdownComment(partitionedFieldMetadata),
    incompatibleFieldsMarkdownComment,
    getIncompatibleFieldsMarkdownTablesComment({
      incompatibleMappings,
      incompatibleValues,
      indexName,
    }),
  ].filter((x) => x !== '');
};
