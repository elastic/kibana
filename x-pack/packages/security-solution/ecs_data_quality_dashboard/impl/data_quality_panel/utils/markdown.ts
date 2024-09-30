/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_PLACEHOLDER, EMPTY_STAT } from '../constants';
import {
  DOCS,
  ILM_PHASE,
  ILM_PHASE_CAPITALIZED,
  INCOMPATIBLE_FIELDS,
  INDEX,
  INDICES,
  INDICES_CHECKED,
  RESULT,
  SIZE,
} from '../translations';
import { IlmPhase } from '../types';
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
