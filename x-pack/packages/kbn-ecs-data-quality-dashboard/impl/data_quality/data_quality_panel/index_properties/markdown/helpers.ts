/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { repeat } from 'lodash/fp';

import {
  ERRORS_MAY_OCCUR,
  ERRORS_CALLOUT_SUMMARY,
  MANAGE,
  MONITOR,
  OR,
  READ,
  THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED,
  VIEW_INDEX_METADATA,
} from '../../data_quality_summary/errors_popover/translations';
import {
  EMPTY_STAT,
  getTotalPatternIncompatible,
  getTotalPatternIndicesChecked,
} from '../../../helpers';
import { SAME_FAMILY } from '../../same_family/translations';
import { HOT, WARM, COLD, FROZEN, UNMANAGED } from '../../../ilm_phases_empty_prompt/translations';
import * as i18n from '../translations';
import type {
  AllowedValue,
  EnrichedFieldMetadata,
  ErrorSummary,
  IlmExplainPhaseCounts,
  IlmPhase,
  PartitionedFieldMetadata,
  PatternRollup,
  UnallowedValueCount,
} from '../../../types';
import { getDocsCountPercent } from '../../summary_table/helpers';
import {
  DOCS,
  ILM_PHASE,
  INCOMPATIBLE_FIELDS,
  INDEX,
  INDICES,
  INDICES_CHECKED,
  RESULT,
} from '../../summary_table/translations';
import { DATA_QUALITY_TITLE } from '../../../translations';

export const EMPTY_PLACEHOLDER = '--';

export const TRIPLE_BACKTICKS = '```';

export const ECS_FIELD_REFERENCE_URL =
  'https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html';

/** The documentation link shown in the `Data Quality` dashboard */
export const ECS_REFERENCE_URL = 'https://www.elastic.co/guide/en/ecs/current/ecs-reference.html';
export const MAPPING_URL =
  'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html';

export const escape = (content: string | undefined): string | undefined =>
  content != null ? content.replaceAll('\n', ' ').replaceAll('|', '\\|') : content;

export const escapePreserveNewlines = (content: string | undefined): string | undefined =>
  content != null ? content.replaceAll('|', '\\|') : content;

export const getHeaderSeparator = (headerLength: number): string => repeat(headerLength + 2, '-');

export const getMarkdownTableHeader = (headerNames: string[]) => `
| ${headerNames.map((name) => `${escape(name)} | `).join('')}
|${headerNames.map((name) => `${getHeaderSeparator(name.length)}|`).join('')}`;

export const getCodeFormattedValue = (value: string | undefined) =>
  `\`${escape(value ?? EMPTY_PLACEHOLDER)}\``;

export const getAllowedValues = (allowedValues: AllowedValue[] | undefined): string =>
  allowedValues == null
    ? getCodeFormattedValue(undefined)
    : allowedValues.map((x) => getCodeFormattedValue(x.name)).join(', ');

export const getIndexInvalidValues = (indexInvalidValues: UnallowedValueCount[]): string =>
  indexInvalidValues.length === 0
    ? getCodeFormattedValue(undefined)
    : indexInvalidValues
        .map(({ fieldName, count }) => `${getCodeFormattedValue(escape(fieldName))} (${count})`)
        .join(',\n');

export const getCommonMarkdownTableRows = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): string =>
  enrichedFieldMetadata
    .map(
      (x) =>
        `| ${escape(x.indexFieldName)} | ${getCodeFormattedValue(x.type)} | ${getCodeFormattedValue(
          x.indexFieldType
        )}  | ${getAllowedValues(x.allowed_values)} | ${getIndexInvalidValues(
          x.indexInvalidValues
        )} | ${escape(x.description ?? EMPTY_PLACEHOLDER)} |`
    )
    .join('\n');

export const getCustomMarkdownTableRows = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): string =>
  enrichedFieldMetadata
    .map(
      (x) =>
        `| ${escape(x.indexFieldName)} | ${getCodeFormattedValue(
          x.indexFieldType
        )} | ${getAllowedValues(x.allowed_values)} |`
    )
    .join('\n');

export const getSameFamilyBadge = (enrichedFieldMetadata: EnrichedFieldMetadata): string =>
  enrichedFieldMetadata.isInSameFamily ? getCodeFormattedValue(SAME_FAMILY) : '';

export const getIncompatibleMappingsMarkdownTableRows = (
  incompatibleMappings: EnrichedFieldMetadata[]
): string =>
  incompatibleMappings
    .map(
      (x) =>
        `| ${escape(x.indexFieldName)} | ${getCodeFormattedValue(x.type)} | ${getCodeFormattedValue(
          x.indexFieldType
        )} ${getSameFamilyBadge(x)} |`
    )
    .join('\n');

export const getIncompatibleValuesMarkdownTableRows = (
  incompatibleValues: EnrichedFieldMetadata[]
): string =>
  incompatibleValues
    .map(
      (x) =>
        `| ${escape(x.indexFieldName)} | ${getAllowedValues(
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
  `#### ${escape(title)}

${escapePreserveNewlines(suggestedAction)}`;

export const getErrorsMarkdownTableRows = (errorSummary: ErrorSummary[]): string =>
  errorSummary
    .map(
      ({ pattern, indexName, error }) =>
        `| ${escape(pattern)} | ${escape(indexName ?? EMPTY_PLACEHOLDER)} | ${getCodeFormattedValue(
          error
        )} |`
    )
    .join('\n');

export const getErrorsMarkdownTable = ({
  errorSummary,
  getMarkdownTableRows,
  headerNames,
  title,
}: {
  errorSummary: ErrorSummary[];
  getMarkdownTableRows: (errorSummary: ErrorSummary[]) => string;
  headerNames: string[];
  title: string;
}): string =>
  errorSummary.length > 0
    ? `## ${escape(title)}

${ERRORS_CALLOUT_SUMMARY}

${ERRORS_MAY_OCCUR}

${THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED}
- \`${MONITOR}\` ${OR} \`${MANAGE}\`
- \`${VIEW_INDEX_METADATA}\`
- \`${READ}\`

${getMarkdownTableHeader(headerNames)}
${getMarkdownTableRows(errorSummary)}
`
    : '';

export const getMarkdownTable = ({
  enrichedFieldMetadata,
  getMarkdownTableRows,
  headerNames,
  title,
}: {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  getMarkdownTableRows: (enrichedFieldMetadata: EnrichedFieldMetadata[]) => string;
  headerNames: string[];
  title: string;
}): string =>
  enrichedFieldMetadata.length > 0
    ? `#### ${escape(title)}

${getMarkdownTableHeader(headerNames)}
${getMarkdownTableRows(enrichedFieldMetadata)}
`
    : '';

export const getSummaryMarkdownComment = ({
  ecsFieldReferenceUrl,
  ecsReferenceUrl,
  incompatible,
  indexName,
  mappingUrl,
}: {
  ecsFieldReferenceUrl: string;
  ecsReferenceUrl: string;
  incompatible: number | undefined;
  indexName: string;
  mappingUrl: string;
}): string =>
  `### ${escape(indexName)}
`;

export const getTabCountsMarkdownComment = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): string =>
  `### **${i18n.INCOMPATIBLE_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.incompatible.length}`
  )} **${i18n.CUSTOM_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.custom.length}`
  )} **${i18n.ECS_COMPLIANT_FIELDS}** ${getCodeFormattedValue(
    `${partitionedFieldMetadata.ecsCompliant.length}`
  )} **${i18n.ALL_FIELDS}** ${getCodeFormattedValue(`${partitionedFieldMetadata.all.length}`)}
`;

export const getResultEmoji = (incompatible: number | undefined): string => {
  if (incompatible == null) {
    return EMPTY_PLACEHOLDER;
  } else {
    return incompatible === 0 ? '✅' : '❌';
  }
};

export const getSummaryTableMarkdownHeader = (): string =>
  `| ${RESULT} | ${INDEX} | ${DOCS} | ${INCOMPATIBLE_FIELDS} | ${ILM_PHASE} |
|--------|-------|------|---------------------|-----------|`;

export const getSummaryTableMarkdownRow = ({
  docsCount,
  formatNumber,
  ilmPhase,
  incompatible,
  indexName,
  patternDocsCount,
}: {
  docsCount: number;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  incompatible: number | undefined;
  indexName: string;
  patternDocsCount: number;
}): string =>
  `| ${getResultEmoji(incompatible)} | ${escape(indexName)} | ${formatNumber(
    docsCount
  )} (${getDocsCountPercent({
    docsCount,
    patternDocsCount,
  })}) | ${incompatible ?? EMPTY_PLACEHOLDER} | ${
    ilmPhase != null ? getCodeFormattedValue(ilmPhase) : ''
  } |
`;

export const getSummaryTableMarkdownComment = ({
  docsCount,
  formatNumber,
  ilmPhase,
  indexName,
  partitionedFieldMetadata,
  patternDocsCount,
}: {
  docsCount: number;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  patternDocsCount: number;
}): string =>
  `${getSummaryTableMarkdownHeader()}
${getSummaryTableMarkdownRow({
  docsCount,
  formatNumber,
  ilmPhase,
  indexName,
  incompatible: partitionedFieldMetadata.incompatible.length,
  patternDocsCount,
})}
`;

export const getStatsRollupMarkdownComment = ({
  docsCount,
  formatNumber,
  incompatible,
  indices,
  indicesChecked,
}: {
  docsCount: number;
  formatNumber: (value: number | undefined) => string;
  incompatible: number | undefined;
  indices: number | undefined;
  indicesChecked: number | undefined;
}): string =>
  `| ${INCOMPATIBLE_FIELDS} | ${INDICES_CHECKED} | ${INDICES} | ${DOCS} |
|---------------------|-----------------|---------|------|
| ${incompatible ?? EMPTY_STAT} | ${indicesChecked ?? EMPTY_STAT} | ${
    indices ?? EMPTY_STAT
  } | ${formatNumber(docsCount)} |
`;

export const getDataQualitySummaryMarkdownComment = ({
  formatNumber,
  totalDocsCount,
  totalIncompatible,
  totalIndices,
  totalIndicesChecked,
}: {
  formatNumber: (value: number | undefined) => string;
  totalDocsCount: number | undefined;
  totalIncompatible: number | undefined;
  totalIndices: number | undefined;
  totalIndicesChecked: number | undefined;
}): string =>
  `# ${DATA_QUALITY_TITLE}

${getStatsRollupMarkdownComment({
  docsCount: totalDocsCount ?? 0,
  formatNumber,
  incompatible: totalIncompatible,
  indices: totalIndices,
  indicesChecked: totalIndicesChecked,
})}
`;

export const getIlmExplainPhaseCountsMarkdownComment = ({
  hot,
  warm,
  unmanaged,
  cold,
  frozen,
}: IlmExplainPhaseCounts): string =>
  [
    hot > 0 ? getCodeFormattedValue(`${HOT}(${hot})`) : '',
    warm > 0 ? getCodeFormattedValue(`${WARM}(${warm})`) : '',
    unmanaged > 0 ? getCodeFormattedValue(`${UNMANAGED}(${unmanaged})`) : '',
    cold > 0 ? getCodeFormattedValue(`${COLD}(${cold})`) : '',
    frozen > 0 ? getCodeFormattedValue(`${FROZEN}(${frozen})`) : '',
  ].join(' ');

export const getPatternSummaryMarkdownComment = ({
  formatNumber,
  patternRollup,
  patternRollup: { docsCount, indices, ilmExplainPhaseCounts, pattern, results },
}: {
  formatNumber: (value: number | undefined) => string;
  patternRollup: PatternRollup;
}): string =>
  `## ${escape(pattern)}
${
  ilmExplainPhaseCounts != null
    ? getIlmExplainPhaseCountsMarkdownComment(ilmExplainPhaseCounts)
    : ''
}

${getStatsRollupMarkdownComment({
  docsCount: docsCount ?? 0,
  formatNumber,
  incompatible: getTotalPatternIncompatible(results),
  indices,
  indicesChecked: getTotalPatternIndicesChecked(patternRollup),
})}
`;
