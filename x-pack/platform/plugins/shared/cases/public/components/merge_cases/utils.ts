/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_CASES_TO_MERGE,
  MAX_DESCRIPTION_LENGTH,
  MIN_CASES_TO_MERGE,
} from '../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeCasesRequest,
  MergePreviewCase,
} from '../../../common/types/api';
import type { CaseAssignees, CaseSeverity } from '../../../common/types/domain';
import type { CaseUI } from '../../containers/types';
import * as i18n from './translations';

export interface MergeFieldValues {
  title: string;
  description: string;
  severity: CaseSeverity;
  category: string | null;
  tags: string[];
  assignees: CaseAssignees;
}

export type MergeFieldOverrides = Partial<MergeFieldValues>;

type CaseReferenceSource = Pick<MergePreviewCase, 'title'> & { incrementalId?: number | null };

/** Returns how a case is named in merge copy: its number, or its title before it has one. */
export const getCaseReference = ({ incrementalId, title }: CaseReferenceSource): string =>
  incrementalId != null ? `#${incrementalId}` : title;

/** Returns why the selected cases can't be merged, or `undefined` when they can. */
export const getMergeDisabledReason = (
  selectedCases: Array<Pick<CaseUI, 'owner' | 'mergedInto' | 'incrementalId' | 'title'>>
): string | undefined => {
  if (selectedCases.length < MIN_CASES_TO_MERGE) {
    return i18n.DISABLED_TOO_FEW(MIN_CASES_TO_MERGE);
  }

  if (selectedCases.length > MAX_CASES_TO_MERGE) {
    return i18n.DISABLED_TOO_MANY(MAX_CASES_TO_MERGE);
  }

  if (new Set(selectedCases.map(({ owner }) => owner)).size > 1) {
    return i18n.DISABLED_MIXED_OWNERS;
  }

  const alreadyMerged = selectedCases.find(({ mergedInto }) => mergedInto != null);
  if (alreadyMerged != null) {
    return i18n.DISABLED_ALREADY_MERGED(getCaseReference(alreadyMerged));
  }

  return undefined;
};

export const getDefaultFieldValues = ({ fields }: MergeCasesPreviewResponse): MergeFieldValues => ({
  title: fields.title.value,
  description: fields.description.value,
  severity: fields.severity.value,
  category: fields.category.value,
  tags: fields.tags.value,
  assignees: fields.assignees.value,
});

export const getConflictCount = ({ fields }: MergeCasesPreviewResponse): number =>
  [fields.title, fields.description, fields.severity, fields.category].filter(
    ({ hasConflict }) => hasConflict
  ).length;

/** Joins every distinct description under a heading naming the cases it comes from. */
export const combineDescriptions = ({ cases, fields }: MergeCasesPreviewResponse): string => {
  const casesById = new Map(cases.map((theCase) => [theCase.id, theCase]));

  return fields.description.options
    .map(({ value, caseIds }) => {
      const references = caseIds.flatMap((caseId) => {
        const theCase = casesById.get(caseId);
        return theCase ? [getCaseReference(theCase)] : [];
      });
      return `**${i18n.COMBINED_DESCRIPTION_HEADING(references.join(', '))}**\n\n${value}`;
    })
    .join('\n\n---\n\n');
};

export const getAttachmentsToCopyCount = ({ attachments }: MergeCasesPreviewResponse): number =>
  attachments.alerts.toCopy +
  attachments.events.toCopy +
  attachments.observables.toCopy +
  attachments.other.toCopy;

/** Returns the first reason the merge can't run, in the order the spec lists them. */
export const getMergeBlockingReason = ({
  preview,
  values,
  includeAssignees,
}: {
  preview: MergeCasesPreviewResponse;
  values: MergeFieldValues;
  includeAssignees: boolean;
}): string | undefined => {
  const { cases, attachments, fields } = preview;

  if (cases.length < MIN_CASES_TO_MERGE) {
    return i18n.BLOCKED_ADD_ANOTHER_CASE;
  }

  const alreadyMerged = cases.find(({ mergedInto }) => mergedInto != null);
  if (alreadyMerged != null) {
    return i18n.BLOCKED_ALREADY_MERGED(getCaseReference(alreadyMerged));
  }

  if (values.title.trim().length === 0) {
    return i18n.BLOCKED_ENTER_TITLE;
  }

  if (values.description.trim().length === 0) {
    return i18n.BLOCKED_ENTER_DESCRIPTION;
  }

  if (values.description.length > MAX_DESCRIPTION_LENGTH) {
    return i18n.BLOCKED_SHORTEN_DESCRIPTION;
  }

  if (attachments.alerts.overLimit > 0) {
    return i18n.BLOCKED_ALERTS_OVER_LIMIT(attachments.alerts.overLimit);
  }

  if (attachments.observables.overLimit > 0) {
    return i18n.BLOCKED_OBSERVABLES_OVER_LIMIT(attachments.observables.overLimit);
  }

  if (attachments.other.overLimit > 0) {
    return i18n.BLOCKED_OTHER_OVER_LIMIT(attachments.other.overLimit);
  }

  if (includeAssignees && values.assignees.length > fields.assignees.max) {
    return i18n.BLOCKED_TOO_MANY_ASSIGNEES(values.assignees.length - fields.assignees.max);
  }

  if (values.tags.length > fields.tags.max) {
    return i18n.BLOCKED_TOO_MANY_TAGS(values.tags.length - fields.tags.max);
  }

  return undefined;
};

export const buildMergeRequest = ({
  caseIds,
  destinationCaseId,
  values,
  includeAssignees,
  closeOriginals,
  note,
}: {
  caseIds: string[];
  destinationCaseId?: string;
  values: MergeFieldValues;
  includeAssignees: boolean;
  closeOriginals: boolean;
  note: string;
}): MergeCasesRequest => {
  const trimmedNote = note.trim();

  return {
    caseIds,
    ...(destinationCaseId != null ? { destinationCaseId } : {}),
    fields: {
      title: values.title.trim(),
      description: values.description,
      severity: values.severity,
      category: values.category,
      tags: values.tags,
      ...(includeAssignees ? { assignees: values.assignees } : {}),
    },
    closeOriginals,
    ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
  };
};
