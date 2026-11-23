/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MergeCasesPreviewResponse, MergeConflict } from '../../../../common/types/api';

/** Describes a merge preview in words for an LLM: the Agent Builder tool and the AI resolution. */

const DEFAULT_MAX_VALUE_LENGTH = 200;

/** A field value as the preview holds it; connectors and templates are named. */
export type MergeDisplayValue = string | number | boolean | null | { name: string };

export interface MergeConflictRow {
  value: MergeDisplayValue;
  options: Array<{ value: MergeDisplayValue; caseIds: string[]; invalid?: unknown }>;
}

/** A value as quoted text, cut to `maxLength` characters. */
export const formatMergeValue = (
  value: MergeDisplayValue,
  maxLength: number = DEFAULT_MAX_VALUE_LENGTH
): string => {
  if (value == null) {
    return 'none';
  }
  if (typeof value === 'object') {
    return `"${value.name}"`;
  }
  const text = String(value);
  return JSON.stringify(text.length > maxLength ? `${text.slice(0, maxLength)}…` : text);
};

/** `#N`, or the quoted title while the case has no number yet. */
export const getMergeCaseRef = (preview: MergeCasesPreviewResponse, caseId: string): string => {
  const theCase = preview.cases.find(({ id }) => id === caseId);
  if (theCase == null) {
    return caseId;
  }
  return theCase.incrementalId != null ? `#${theCase.incrementalId}` : `"${theCase.title}"`;
};

/** The preview row a conflict is about, with its suggested value and options. */
export const getMergeConflictRow = (
  { fields }: MergeCasesPreviewResponse,
  { field, key }: Pick<MergeConflict, 'field' | 'key'>
): MergeConflictRow | undefined => {
  switch (field) {
    case 'customFields':
      return fields.customFields.find((row) => row.key === key);
    case 'extendedFields':
      return fields.extendedFields.find((row) => row.key === key);
    case 'connector':
      return fields.connector;
    case 'template':
      return fields.template;
    default:
      return fields[field];
  }
};
