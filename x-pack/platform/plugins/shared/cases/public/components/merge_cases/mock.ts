/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MergeAttachmentSummary,
  MergeCasesPreviewResponse,
  MergeConflict,
  MergePreviewCase,
} from '../../../common/types/api';
import { CaseSeverity, CaseStatuses, ConnectorTypes } from '../../../common/types/domain';

export const mergeSummary = (
  overrides: Partial<MergeAttachmentSummary> = {}
): MergeAttachmentSummary => ({
  total: 0,
  duplicates: 0,
  existing: 0,
  toCopy: 0,
  leftOut: 0,
  notCopied: [],
  max: null,
  overBy: 0,
  ...overrides,
});

export const mergePreviewCase = (
  id: string,
  incrementalId: number | null,
  title: string,
  overrides: Partial<MergePreviewCase> = {}
): MergePreviewCase => ({
  id,
  version: `${id}-version`,
  title,
  incrementalId,
  status: CaseStatuses.open,
  severity: CaseSeverity.LOW,
  owner: 'securitySolution',
  createdAt: '2024-01-01T00:00:00.000Z',
  totalAlerts: 0,
  template: null,
  merge: null,
  ...overrides,
});

export const titleConflict: MergeConflict = {
  field: 'title',
  reason: 'differentValues',
  resolved: false,
};

const noneConnector = {
  id: 'none',
  name: 'none',
  type: ConnectorTypes.none,
  fields: null,
} as const;

/** A preview of merging #118 "Phishing" and #119 "Follow-up" into a new case. */
export const buildMergePreview = ({
  attachments = {},
  choices = null,
  conflicts = [titleConflict],
  fields = {},
}: {
  attachments?: Partial<MergeCasesPreviewResponse['attachments']>;
  choices?: MergeCasesPreviewResponse['choices'];
  conflicts?: MergeConflict[];
  fields?: Partial<MergeCasesPreviewResponse['fields']>;
} = {}): MergeCasesPreviewResponse => ({
  cases: [
    mergePreviewCase('case-1', 118, 'Phishing'),
    mergePreviewCase('case-2', 119, 'Follow-up'),
  ],
  destination: { id: null, isNew: true },
  fields: {
    title: {
      value: 'Phishing',
      provenance: 'oldest',
      sourceCaseId: 'case-1',
      options: [
        { value: 'Phishing', caseIds: ['case-1'] },
        { value: 'Follow-up', caseIds: ['case-2'] },
      ],
      hasConflict: true,
    },
    description: {
      value: 'First description',
      provenance: 'same',
      sourceCaseId: null,
      options: [{ value: 'First description', caseIds: ['case-1', 'case-2'] }],
      hasConflict: false,
      combinedValue: null,
    },
    severity: {
      value: CaseSeverity.LOW,
      provenance: 'same',
      sourceCaseId: null,
      options: [{ value: CaseSeverity.LOW, caseIds: ['case-1', 'case-2'] }],
      hasConflict: false,
    },
    category: {
      value: null,
      provenance: 'none',
      sourceCaseId: null,
      options: [],
      hasConflict: false,
    },
    connector: {
      value: noneConnector,
      provenance: 'none',
      sourceCaseId: null,
      options: [],
      hasConflict: false,
    },
    template: {
      value: null,
      provenance: 'none',
      sourceCaseId: null,
      options: [],
      hasConflict: false,
      candidates: [],
    },
    customFields: [],
    extendedFields: [],
    tags: { value: ['phishing'], provenance: 'combined', max: 200, overBy: 0 },
    assignees: {
      value: [],
      provenance: 'none',
      max: 10,
      overBy: 0,
      canChange: true,
      unavailableReason: null,
    },
    notCopiedFields: [],
    ...fields,
  },
  effectiveTemplate: null,
  conflicts,
  limits: [],
  canMerge: conflicts.length === 0,
  attachments: {
    alerts: { ...mergeSummary({ total: 4, toCopy: 3, duplicates: 1, max: 1000 }), byRule: [] },
    attacks: mergeSummary(),
    events: mergeSummary(),
    observables: mergeSummary({ max: 50 }),
    other: mergeSummary({ total: 2, toCopy: 2, max: 100 }),
    files: { total: 0 },
    comments: { total: 1 },
    ...attachments,
  },
  choices,
});
