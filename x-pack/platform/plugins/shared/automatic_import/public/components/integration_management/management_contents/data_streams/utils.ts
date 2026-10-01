/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTokenProps } from '@elastic/eui';
import ipaddr from 'ipaddr.js';
import * as i18n from './translations';

const TYPE_TO_ICON_MAP: Record<string, EuiTokenProps['iconType']> = {
  string: 'tokenString',
  keyword: 'tokenKeyword',
  constant_keyword: 'tokenConstant',
  wildcard: 'tokenString',
  text: 'tokenString',
  match_only_text: 'tokenString',
  number: 'tokenNumber',
  byte: 'tokenNumber',
  short: 'tokenNumber',
  integer: 'tokenNumber',
  long: 'tokenNumber',
  unsigned_long: 'tokenNumber',
  half_float: 'tokenNumber',
  float: 'tokenNumber',
  double: 'tokenNumber',
  date: 'tokenDate',
  date_nanos: 'tokenDate',
  ip: 'tokenIP',
  geo_point: 'tokenGeo',
  version: 'tokenTag',
  object: 'tokenQuestion',
  nested: 'tokenNested',
  boolean: 'tokenBoolean',
} as const;

export const getIconFromType = (type: string | null | undefined): EuiTokenProps['iconType'] => {
  if (!type) return 'tokenQuestion';
  return TYPE_TO_ICON_MAP[type] ?? 'tokenQuestion';
};

export const isValidIp = (value: string): boolean => {
  try {
    return ipaddr.IPv4.isValidFourPartDecimal(value) || ipaddr.IPv6.isValid(value);
  } catch {
    return false;
  }
};

export const getFieldType = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isInteger(value) ? 'long' : 'float';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'nested';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') {
    const looksLikeIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value);
    const looksLikeIPv6 = /^[0-9a-fA-F:]+$/.test(value);
    if (looksLikeIPv4 || looksLikeIPv6) {
      if (isValidIp(value)) {
        return 'ip';
      }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  }
  return 'string';
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Normalize pipeline sample docs. Some code paths persist ingest `_source`
 * objects; others persist the simulate wrapper `{ _source }` or `{ doc: { _source } }`.
 */
export const unwrapPipelineDocument = (
  document: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  if (!document) {
    return undefined;
  }
  if (isPlainObject(document._source)) {
    return document._source;
  }
  if (isPlainObject(document.doc) && isPlainObject(document.doc._source)) {
    return document.doc._source;
  }
  return document;
};

// Diff function based on longest common subsequence used in Git diff algorithm
export const diffPipelineLines = (
  original: string,
  updated: string
): { linesAdded: number; linesRemoved: number; netLineChange: number } => {
  const originalLines = original.split('\n');
  const newLines = updated.split('\n');
  const m = originalLines.length;
  const n = newLines.length;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        originalLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const lcsLength = dp[m][n];
  return {
    linesAdded: n - lcsLength,
    linesRemoved: m - lcsLength,
    netLineChange: n - m,
  };
};

export const flattenPipelineObject = (
  obj: Record<string, unknown>,
  parentKey = ''
): Array<{ field: string; value: string; type: string }> => {
  const result: Array<{ field: string; value: string; type: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = parentKey ? `${parentKey}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flattenPipelineObject(value as Record<string, unknown>, fieldName));
    } else {
      result.push({
        field: fieldName,
        value: Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''),
        type: getFieldType(value),
      });
    }
  }

  return result;
};

export interface FlyoutFooterWarning {
  title: string;
  description: string;
}

export interface FlyoutFooterState {
  isResetDisabled: boolean;
  isSaveDisabled: boolean;
  saveTestSubj: string;
  warning?: FlyoutFooterWarning;
}

export const getFlyoutFooterState = ({
  isTableTab,
  mappingDirty,
  mappingSaving,
  pipelineDirty,
  pipelineSaving,
  pipelineText,
  isSaving,
  showPipelineWarning,
  showTableWarning,
}: {
  isTableTab: boolean;
  mappingDirty: boolean;
  mappingSaving: boolean;
  pipelineDirty: boolean;
  pipelineSaving: boolean;
  pipelineText: string;
  isSaving: boolean;
  showPipelineWarning: boolean;
  showTableWarning: boolean;
}): FlyoutFooterState => {
  const isResetDisabled = isSaving || !(isTableTab ? mappingDirty : pipelineDirty);
  const isSaveDisabled = isTableTab
    ? !mappingDirty || mappingSaving || pipelineDirty
    : !pipelineDirty || pipelineSaving || mappingDirty || !pipelineText.trim();
  const saveTestSubj = isTableTab ? 'mappingEditorApplyButton' : 'editPipelineFlyoutSaveButton';

  if (showPipelineWarning) {
    return {
      isResetDisabled,
      isSaveDisabled,
      saveTestSubj,
      warning: {
        title: i18n.EDIT_PIPELINE_FLYOUT.unsavedPipelineChangesTitle,
        description: i18n.EDIT_PIPELINE_FLYOUT.unsavedPipelineChangesDescription,
      },
    };
  }
  if (showTableWarning) {
    return {
      isResetDisabled,
      isSaveDisabled,
      saveTestSubj,
      warning: {
        title: i18n.EDIT_PIPELINE_FLYOUT.unsavedTableChangesTitle,
        description: i18n.EDIT_PIPELINE_FLYOUT.unsavedTableChangesDescription,
      },
    };
  }
  return { isResetDisabled, isSaveDisabled, saveTestSubj };
};
