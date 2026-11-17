/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MergeCasesPreviewResponse } from '../../../common/types/api';
import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import { basicCase } from '../../containers/mock';
import {
  applyExclusions,
  buildMergeRequest,
  combineDescriptions,
  getActiveExclusions,
  getAttachmentsToCopyCount,
  getKeysOutsideNewest,
  getCaseReference,
  getConflictCount,
  getDefaultFieldValues,
  getMergeBlockingReason,
  getMergeDisabledReason,
  getRoomForKind,
} from './utils';

const summary = (overrides: Partial<MergeCasesPreviewResponse['attachments']['alerts']> = {}) => ({
  total: 0,
  duplicates: 0,
  toCopy: 0,
  existing: 0,
  max: null,
  overLimit: 0,
  ...overrides,
});

const previewCase = (id: string, incrementalId: number | null, title: string) => ({
  id,
  version: `${id}-version`,
  title,
  incrementalId,
  status: CaseStatuses.open,
  severity: CaseSeverity.LOW,
  owner: 'securitySolution',
  createdAt: '2024-01-01T00:00:00.000Z',
  totalAlerts: 0,
});

const preview: MergeCasesPreviewResponse = {
  cases: [previewCase('case-1', 118, 'Phishing'), previewCase('case-2', null, 'Follow-up')],
  destinationCaseId: null,
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
      provenance: 'oldest',
      sourceCaseId: 'case-1',
      options: [
        { value: 'First description', caseIds: ['case-1'] },
        { value: 'Second description', caseIds: ['case-2'] },
      ],
      hasConflict: true,
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
    tags: { value: ['phishing'], provenance: 'combined', max: 200 },
    assignees: { value: [{ uid: 'u1' }], provenance: 'same', max: 10 },
  },
  attachments: {
    alerts: summary({ total: 4, toCopy: 3, duplicates: 1, max: 1000 }),
    events: summary({ total: 1, toCopy: 1 }),
    observables: summary({ max: 50 }),
    other: summary({ total: 2, toCopy: 2, max: 100 }),
    files: { total: 1 },
    comments: { total: 3 },
  },
  choices: null,
};

describe('merge cases utils', () => {
  describe('getCaseReference', () => {
    it('uses the case number when there is one', () => {
      expect(getCaseReference({ incrementalId: 142, title: 'Phishing' })).toBe('#142');
    });

    it('falls back to the title', () => {
      expect(getCaseReference({ incrementalId: null, title: 'Phishing' })).toBe('Phishing');
    });
  });

  describe('getMergeDisabledReason', () => {
    const selected = (id: string, overrides: Partial<typeof basicCase> = {}) => ({
      ...basicCase,
      id,
      ...overrides,
    });

    it('allows two to ten cases from one solution', () => {
      expect(getMergeDisabledReason([selected('a'), selected('b')])).toBeUndefined();
    });

    it('requires at least two cases', () => {
      expect(getMergeDisabledReason([selected('a')])).toBe('Select at least 2 cases to merge.');
    });

    it('allows at most ten cases', () => {
      const cases = Array.from({ length: 11 }, (_, position) => selected(`case-${position}`));
      expect(getMergeDisabledReason(cases)).toBe('Select 10 or fewer cases to merge.');
    });

    it('requires cases from one solution', () => {
      expect(
        getMergeDisabledReason([selected('a'), selected('b', { owner: 'observability' })])
      ).toBe('Select cases from one solution to merge them.');
    });

    it('allows a closed case', () => {
      expect(
        getMergeDisabledReason([selected('a'), selected('b', { status: CaseStatuses.closed })])
      ).toBeUndefined();
    });
  });

  describe('getConflictCount', () => {
    it('counts fields whose values differ between cases', () => {
      expect(getConflictCount(preview)).toBe(2);
    });
  });

  describe('combineDescriptions', () => {
    it('joins every description under a heading naming its cases', () => {
      expect(combineDescriptions(preview)).toBe(
        '**From #118**\n\nFirst description\n\n---\n\n**From Follow-up**\n\nSecond description'
      );
    });
  });

  describe('exclusions', () => {
    const alertChoice = (key: string) => ({
      key,
      sourceCaseId: 'case-1',
      alertId: key,
      index: 'alerts-index',
      ruleId: 'rule-1',
      ruleName: 'Rule',
      addedAt: '2024-01-01T00:00:00.000Z',
    });
    const otherChoice = (key: string, countsTowardLimit: boolean) => ({
      key,
      sourceCaseId: 'case-1',
      type: 'lens',
      addedAt: '2024-01-01T00:00:00.000Z',
      countsTowardLimit,
    });
    const overLimit = {
      attachments: {
        ...preview.attachments,
        alerts: summary({ total: 3, toCopy: 3, existing: 1, max: 2, overLimit: 2 }),
        other: summary({ total: 2, toCopy: 2, max: 1, overLimit: 0 }),
      },
      choices: {
        alerts: [alertChoice('a1'), alertChoice('a2'), alertChoice('a3')],
        events: [],
        observables: [],
        other: [otherChoice('o1', true), otherChoice('o2', false)],
      },
    };

    it('lowers what is copied and what is over the limit', () => {
      const selected = applyExclusions(overLimit, new Set(['a1', 'o2', 'stale']));

      expect(selected.alerts).toEqual(
        expect.objectContaining({ toCopy: 2, overLimit: 1, excluded: 1 })
      );
      expect(selected.other).toEqual(
        expect.objectContaining({ toCopy: 1, overLimit: 0, excluded: 1 })
      );
      expect(selected.events.excluded).toBe(0);
    });

    it('reports how many items fit when a kind is over its limit', () => {
      expect(getRoomForKind(overLimit.attachments.alerts, overLimit.choices, 'alerts')).toBe(1);
      expect(getRoomForKind(overLimit.attachments.other, overLimit.choices, 'other')).toBeNull();
    });

    it('leaves out everything but the most recently added alerts', () => {
      const alerts = [
        { ...alertChoice('a1'), addedAt: '2024-01-01T00:00:00.000Z' },
        { ...alertChoice('a2'), addedAt: '2024-03-01T00:00:00.000Z' },
        { ...alertChoice('a3'), addedAt: '2024-02-01T00:00:00.000Z' },
        { ...alertChoice('a4'), addedAt: '2024-03-01T00:00:00.000Z' },
      ];

      expect(getKeysOutsideNewest(alerts, 2)).toEqual(['a3', 'a1']);
    });

    it('keeps only the keys the preview still offers', () => {
      expect(getActiveExclusions(overLimit.choices, new Set(['a2', 'stale']))).toEqual(['a2']);
      expect(getActiveExclusions(null, new Set(['a2']))).toEqual([]);
    });
  });

  describe('getAttachmentsToCopyCount', () => {
    it('adds up every attachment kind that is copied', () => {
      expect(getAttachmentsToCopyCount(preview.attachments)).toBe(6);
    });
  });

  describe('getMergeBlockingReason', () => {
    const values = getDefaultFieldValues(preview);

    it('does not block a valid merge', () => {
      expect(
        getMergeBlockingReason({
          preview,
          attachments: preview.attachments,
          values,
          includeAssignees: true,
        })
      ).toBeUndefined();
    });

    it('requires a title', () => {
      expect(
        getMergeBlockingReason({
          preview,
          attachments: preview.attachments,
          values: { ...values, title: '  ' },
          includeAssignees: true,
        })
      ).toBe('Enter a title to merge');
    });

    it('blocks when alerts are over the limit', () => {
      expect(
        getMergeBlockingReason({
          preview,
          attachments: {
            ...preview.attachments,
            alerts: summary({ total: 1240, toCopy: 1240, max: 1000, overLimit: 240 }),
          },
          values,
          includeAssignees: true,
        })
      ).toBe('240 alerts over the limit');
    });

    it('blocks too many assignees only when assignees are merged', () => {
      const tooManyAssignees = {
        ...values,
        assignees: Array.from({ length: 12 }, (_, position) => ({ uid: `u${position}` })),
      };

      expect(
        getMergeBlockingReason({
          preview,
          attachments: preview.attachments,
          values: tooManyAssignees,
          includeAssignees: true,
        })
      ).toBe('Remove 2 assignees to merge');
      expect(
        getMergeBlockingReason({
          preview,
          attachments: preview.attachments,
          values: tooManyAssignees,
          includeAssignees: false,
        })
      ).toBeUndefined();
    });
  });

  describe('buildMergeRequest', () => {
    const values = getDefaultFieldValues(preview);

    it('builds a request for a new case', () => {
      expect(
        buildMergeRequest({
          caseIds: ['case-1', 'case-2'],
          values,
          includeAssignees: true,
          closeOriginals: true,
          note: '  ',
          excludedAttachments: [],
        })
      ).toEqual({
        caseIds: ['case-1', 'case-2'],
        fields: {
          title: 'Phishing',
          description: 'First description',
          severity: CaseSeverity.LOW,
          category: null,
          tags: ['phishing'],
          assignees: [{ uid: 'u1' }],
        },
        closeOriginals: true,
      });
    });

    it('includes the destination and note, and leaves out assignees when they are hidden', () => {
      const request = buildMergeRequest({
        caseIds: ['case-1', 'case-2'],
        destinationCaseId: 'case-2',
        values,
        includeAssignees: false,
        closeOriginals: false,
        note: ' Merged ',
        excludedAttachments: ['alerts|alert-1|alerts-index'],
      });

      expect(request.destinationCaseId).toBe('case-2');
      expect(request.note).toBe('Merged');
      expect(request.fields.assignees).toBeUndefined();
      expect(request.excludedAttachments).toEqual(['alerts|alert-1|alerts-index']);
    });
  });
});
