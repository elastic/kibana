/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMENT_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
} from '../../../../common/constants/attachments';
import { MAX_ALERTS_PER_CASE, SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import type { AttachmentV2, Case } from '../../../../common/types/domain';
import { CaseSeverity, CustomFieldTypes } from '../../../../common/types/domain';
import { basicCaseFields } from '../../../services/test_utils';
import {
  buildAttachmentPlan,
  buildFieldsPreview,
  chunkItems,
  combineCustomFields,
  orderCasesForMerge,
} from './utils';

const makeCase = (id: string, createdAt: string, overrides: Partial<Case> = {}): Case => ({
  ...basicCaseFields,
  id,
  version: `${id}-version`,
  totalComment: 0,
  totalAlerts: 0,
  created_at: createdAt,
  ...overrides,
});

const attachmentBase = {
  version: 'attachment-version',
  owner: SECURITY_SOLUTION_OWNER,
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: { username: 'elastic', full_name: null, email: null },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

const alertAttachment = (id: string, alertIds: string[], index = 'alerts-index'): AttachmentV2 => ({
  ...attachmentBase,
  id,
  type: SECURITY_ALERT_ATTACHMENT_TYPE,
  attachmentId: alertIds,
  metadata: { index: alertIds.map(() => index), rule: { id: 'rule-1', name: 'Rule' } },
});

const eventAttachment = (id: string, eventId: string): AttachmentV2 => ({
  ...attachmentBase,
  id,
  type: SECURITY_EVENT_ATTACHMENT_TYPE,
  attachmentId: eventId,
  metadata: { index: 'events-index' },
});

const commentAttachment = (id: string): AttachmentV2 => ({
  ...attachmentBase,
  id,
  type: COMMENT_ATTACHMENT_TYPE,
  data: { content: 'A comment' },
});

const fileAttachment = (id: string): AttachmentV2 => ({
  ...attachmentBase,
  id,
  type: FILE_ATTACHMENT_TYPE,
  attachmentId: `file-${id}`,
  metadata: { files: [] },
});

const oldest = makeCase('oldest', '2024-01-01T00:00:00.000Z');
const middle = makeCase('middle', '2024-02-01T00:00:00.000Z');
const newest = makeCase('newest', '2024-03-01T00:00:00.000Z');

describe('merge utils', () => {
  describe('orderCasesForMerge', () => {
    it('orders cases oldest first', () => {
      expect(orderCasesForMerge([newest, oldest, middle]).map(({ id }) => id)).toEqual([
        'oldest',
        'middle',
        'newest',
      ]);
    });

    it('puts an existing destination first', () => {
      expect(orderCasesForMerge([newest, oldest, middle], 'newest').map(({ id }) => id)).toEqual([
        'newest',
        'oldest',
        'middle',
      ]);
    });
  });

  describe('buildFieldsPreview', () => {
    it('does not flag a conflict when only one case has a value', () => {
      const { category } = buildFieldsPreview([
        { ...oldest, category: null },
        { ...middle, category: 'Malware' },
        { ...newest, category: '  ' },
      ]);

      expect(category).toEqual({
        value: 'Malware',
        provenance: 'only',
        sourceCaseId: 'middle',
        options: [{ value: 'Malware', caseIds: ['middle'] }],
        hasConflict: false,
      });
    });

    it('does not flag a conflict when every case has the same value', () => {
      const { title } = buildFieldsPreview([
        { ...oldest, title: 'Phishing' },
        { ...middle, title: 'Phishing' },
      ]);

      expect(title.provenance).toBe('same');
      expect(title.hasConflict).toBe(false);
      expect(title.options).toEqual([{ value: 'Phishing', caseIds: ['oldest', 'middle'] }]);
    });

    it('returns no value when no case has one', () => {
      const { category } = buildFieldsPreview([oldest, middle]);

      expect(category).toEqual({
        value: null,
        provenance: 'none',
        sourceCaseId: null,
        options: [],
        hasConflict: false,
      });
    });

    it('flags a conflict and defaults to the oldest case for a new case', () => {
      const { title } = buildFieldsPreview([
        { ...oldest, title: 'First' },
        { ...middle, title: 'Second' },
      ]);

      expect(title.hasConflict).toBe(true);
      expect(title.value).toBe('First');
      expect(title.provenance).toBe('oldest');
      expect(title.sourceCaseId).toBe('oldest');
    });

    it("defaults to an existing destination's value when values conflict", () => {
      const ordered = orderCasesForMerge(
        [
          { ...oldest, title: 'First' },
          { ...newest, title: 'Destination' },
        ],
        'newest'
      );
      const { title } = buildFieldsPreview(ordered, 'newest');

      expect(title).toEqual(
        expect.objectContaining({
          value: 'Destination',
          provenance: 'destination',
          sourceCaseId: 'newest',
          hasConflict: true,
        })
      );
    });

    it('defaults severity to the highest value for a new case', () => {
      const { severity } = buildFieldsPreview([
        { ...oldest, severity: CaseSeverity.MEDIUM },
        { ...middle, severity: CaseSeverity.CRITICAL },
        { ...newest, severity: CaseSeverity.LOW },
      ]);

      expect(severity.value).toBe(CaseSeverity.CRITICAL);
      expect(severity.provenance).toBe('highest');
      expect(severity.sourceCaseId).toBe('middle');
      expect(severity.hasConflict).toBe(true);
    });

    it('combines tags and assignees without duplicates', () => {
      const { tags, assignees } = buildFieldsPreview([
        { ...oldest, tags: ['phishing', 'email'], assignees: [{ uid: 'u1' }] },
        { ...middle, tags: ['email', 'finance'], assignees: [{ uid: 'u1' }, { uid: 'u2' }] },
      ]);

      expect(tags).toEqual({
        value: ['phishing', 'email', 'finance'],
        provenance: 'combined',
        max: 200,
      });
      expect(assignees).toEqual({
        value: [{ uid: 'u1' }, { uid: 'u2' }],
        provenance: 'combined',
        max: 10,
      });
    });
  });

  describe('combineCustomFields', () => {
    it('keeps the first value per configured key and drops keys that are not configured', () => {
      const customFields = combineCustomFields(
        [
          {
            ...oldest,
            customFields: [
              { key: 'priority', type: CustomFieldTypes.TEXT, value: null },
              { key: 'removed', type: CustomFieldTypes.TEXT, value: 'stale' },
            ],
          },
          {
            ...middle,
            customFields: [{ key: 'priority', type: CustomFieldTypes.TEXT, value: 'high' }],
          },
          {
            ...newest,
            customFields: [{ key: 'priority', type: CustomFieldTypes.TEXT, value: 'low' }],
          },
        ],
        new Set(['priority'])
      );

      expect(customFields).toEqual([
        { key: 'priority', type: CustomFieldTypes.TEXT, value: 'high' },
      ]);
    });
  });

  describe('buildAttachmentPlan', () => {
    it('copies each alert once and counts duplicates', () => {
      const plan = buildAttachmentPlan({
        orderedCases: [oldest, middle],
        attachmentsByCaseId: new Map([
          ['oldest', [alertAttachment('a1', ['alert-1', 'alert-2'])]],
          ['middle', [alertAttachment('a2', ['alert-2', 'alert-3'])]],
        ]),
      });

      expect(plan.summaries.alerts).toEqual({
        total: 4,
        duplicates: 1,
        toCopy: 3,
        existing: 0,
        max: MAX_ALERTS_PER_CASE,
        overLimit: 0,
      });
      expect(plan.items).toHaveLength(2);
      expect(plan.items[1]).toEqual(
        expect.objectContaining({
          kind: 'alerts',
          sourceCaseId: 'middle',
          itemCount: 1,
          payload: expect.objectContaining({
            attachmentId: ['alert-3'],
            metadata: expect.objectContaining({ index: ['alerts-index'] }),
          }),
        })
      );
    });

    it('treats the same alert id in different indices as different alerts', () => {
      const plan = buildAttachmentPlan({
        orderedCases: [oldest, middle],
        attachmentsByCaseId: new Map([
          ['oldest', [alertAttachment('a1', ['alert-1'], 'index-a')]],
          ['middle', [alertAttachment('a2', ['alert-1'], 'index-b')]],
        ]),
      });

      expect(plan.summaries.alerts.toCopy).toBe(2);
      expect(plan.summaries.alerts.duplicates).toBe(0);
    });

    it('does not copy what an existing destination already has, but counts it toward the limit', () => {
      const plan = buildAttachmentPlan({
        orderedCases: [newest, oldest],
        destinationCaseId: 'newest',
        attachmentsByCaseId: new Map([
          ['newest', [alertAttachment('a1', ['alert-1'])]],
          ['oldest', [alertAttachment('a2', ['alert-1', 'alert-2'])]],
        ]),
      });

      expect(plan.summaries.alerts).toEqual(
        expect.objectContaining({ total: 2, duplicates: 1, toCopy: 1, existing: 1 })
      );
      expect(plan.items).toHaveLength(1);
      expect(plan.items[0].sourceCaseId).toBe('oldest');
    });

    it('reports how many alerts are over the limit', () => {
      const alertIds = (prefix: string, count: number) =>
        Array.from({ length: count }, (_, position) => `${prefix}-${position}`);

      const plan = buildAttachmentPlan({
        orderedCases: [oldest, middle],
        attachmentsByCaseId: new Map([
          ['oldest', [alertAttachment('a1', alertIds('oldest', 600))]],
          ['middle', [alertAttachment('a2', alertIds('middle', 500))]],
        ]),
      });

      expect(plan.summaries.alerts.toCopy).toBe(1100);
      expect(plan.summaries.alerts.overLimit).toBe(1100 - MAX_ALERTS_PER_CASE);
    });

    it('dedupes events and observables', () => {
      const plan = buildAttachmentPlan({
        orderedCases: [
          {
            ...oldest,
            observables: [
              {
                id: 'o1',
                typeKey: 'ipv4',
                value: '10.0.0.1',
                description: null,
                createdAt: '',
                updatedAt: '',
              },
            ],
          },
          {
            ...middle,
            observables: [
              {
                id: 'o2',
                typeKey: 'ipv4',
                value: '10.0.0.1',
                description: null,
                createdAt: '',
                updatedAt: '',
              },
              {
                id: 'o3',
                typeKey: 'ipv4',
                value: '10.0.0.2',
                description: null,
                createdAt: '',
                updatedAt: '',
              },
            ],
          },
        ],
        attachmentsByCaseId: new Map([
          ['oldest', [eventAttachment('e1', 'event-1')]],
          ['middle', [eventAttachment('e2', 'event-1'), eventAttachment('e3', 'event-2')]],
        ]),
      });

      expect(plan.summaries.events).toEqual(
        expect.objectContaining({ total: 3, duplicates: 1, toCopy: 2, max: null, overLimit: 0 })
      );
      expect(plan.summaries.observables).toEqual(
        expect.objectContaining({ total: 3, duplicates: 1, toCopy: 2 })
      );
      expect(plan.observables.map(({ observable }) => observable.value)).toEqual([
        '10.0.0.1',
        '10.0.0.2',
      ]);
    });

    it('counts files and comments without copying them', () => {
      const plan = buildAttachmentPlan({
        orderedCases: [oldest, middle],
        attachmentsByCaseId: new Map([
          ['oldest', [commentAttachment('c1'), fileAttachment('f1')]],
          ['middle', [commentAttachment('c2')]],
        ]),
      });

      expect(plan.files).toBe(1);
      expect(plan.comments).toBe(2);
      expect(plan.items).toEqual([]);
    });
  });

  describe('chunkItems', () => {
    it('splits items into chunks of the given size', () => {
      expect(chunkItems([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
  });
});
