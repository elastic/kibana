/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
} from '../../../common/constants';
import { AttachmentType } from '../../../common/types/domain';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../../common/types/attachments_v2';
import { buildAttachmentDoc } from './attachments_doc_builder';

/**
 * Unit coverage for the pure `buildAttachmentDoc` transform, focused on
 * two things the mapping-parity / per-subtype-extract harness in
 * `mappings/attachments_schema_drift.test.ts` does NOT exercise:
 *
 *   1. The update-mirror doc SHAPE — i.e. what the doc looks like when
 *      it's built from a partial SO patch (the raw `update` response)
 *      versus a full SO. This is the regression the update path re-reads
 *      the full SO to avoid; without it the analytics doc silently loses
 *      `@timestamp` and drops off every time-filtered Discover/Lens view.
 *   2. The builder's null-safe / defensive branches (user projection,
 *      case-id lookup, id normalization, malformed-SO fallback) which the
 *      schema-drift fixtures always populate and so never probe.
 *
 * The schema-drift test owns "every emitted field is mapped" and "every
 * subtype's curated extract is correct"; this file owns "the builder is
 * a well-behaved pure function on incomplete / adversarial input."
 */

const caseRef: SavedObjectReference = {
  id: 'case-1',
  type: CASE_SAVED_OBJECT,
  name: 'associated-cases',
};

const createdBy = {
  username: 'jane',
  full_name: 'Jane Analyst',
  email: 'jane@example.com',
  profile_uid: 'profile-1',
};

const fullUserAttrs = {
  type: AttachmentType.user,
  comment: 'Original comment',
  owner: 'securitySolution',
  created_at: '2026-05-01T10:00:00.000Z',
  created_by: createdBy,
  updated_at: null,
  updated_by: null,
  pushed_at: null,
  pushed_by: null,
} as unknown as AttachmentPersistedAttributes;

const makeSO = <T>(
  type: string,
  attributes: T,
  overrides: Partial<SavedObject<T>> = {}
): SavedObject<T> =>
  ({
    type,
    id: 'attach-1',
    namespaces: ['default'],
    references: [caseRef],
    attributes,
    ...overrides,
  } as SavedObject<T>);

describe('buildAttachmentDoc', () => {
  describe('update-mirror shape: audit fields survive only with the full SO', () => {
    // FAILURE SCENARIO: an attachment edit mirrors the SO `update` response
    // directly. The response is a partial patch (only the changed fields), so
    // `created_at` is absent → `@timestamp` is written `undefined` → the doc
    // silently drops off every time-filtered Discover/Lens view until
    // reconciliation repairs it. These two tests pin the exact difference
    // between the partial-patch shape (bad) and the full-SO shape (good), and
    // are the unit-level guard the service's re-read (`mirrorUpdatedAttachments`)
    // exists to satisfy. See PR review comment r3531385734.
    it('full SO → @timestamp / created_at / created_by are populated', () => {
      const doc = buildAttachmentDoc(makeSO(CASE_COMMENT_SAVED_OBJECT, fullUserAttrs));

      expect(doc['@timestamp']).toBe('2026-05-01T10:00:00.000Z');
      expect(doc.created_at).toBe('2026-05-01T10:00:00.000Z');
      expect(doc.created_by).toEqual(createdBy);
    });

    it('partial patch SO (the raw update response) → @timestamp / created_at drop out, created_by empties', () => {
      // Exactly what the SO client returns from `update`: only the patched
      // field, no immutable creation fields.
      const patchOnly = { comment: 'Edited comment' } as unknown as AttachmentPersistedAttributes;
      const doc = buildAttachmentDoc(makeSO(CASE_COMMENT_SAVED_OBJECT, patchOnly));

      // The degradation: the time field the whole use case depends on is gone.
      expect(doc['@timestamp']).toBeUndefined();
      expect(doc.created_at).toBeUndefined();
      expect(doc.created_by).toEqual({});

      // ...while the patched field itself survives — which is precisely why the
      // integration `updateComment` test (asserting only `attachment.comment`)
      // could not catch this regression.
      expect(doc.attachment.comment).toBe('Edited comment');
    });
  });

  describe('core field projection', () => {
    it('derives space_id from the SO namespaces', () => {
      const doc = buildAttachmentDoc(
        makeSO(CASE_COMMENT_SAVED_OBJECT, fullUserAttrs, { namespaces: ['team-a'] })
      );
      expect(doc.space_id).toBe('team-a');
    });

    it('defaults space_id to "default" when namespaces are absent', () => {
      const doc = buildAttachmentDoc(
        makeSO(CASE_COMMENT_SAVED_OBJECT, fullUserAttrs, { namespaces: undefined })
      );
      expect(doc.space_id).toBe('default');
    });

    it('denormalizes case.id from the case reference', () => {
      const doc = buildAttachmentDoc(makeSO(CASE_COMMENT_SAVED_OBJECT, fullUserAttrs));
      expect(doc.case.id).toBe('case-1');
    });

    it('emits an empty case.id when the case reference is missing (keeps the strict mapping happy)', () => {
      const doc = buildAttachmentDoc(
        makeSO(CASE_COMMENT_SAVED_OBJECT, fullUserAttrs, { references: [] })
      );
      expect(doc.case.id).toBe('');
    });

    it('projects updated_by / pushed_by when present and nulls them when absent', () => {
      const updatedBy = { ...createdBy, username: 'editor' };
      const withUpdate = {
        ...fullUserAttrs,
        updated_at: '2026-05-02T10:00:00.000Z',
        updated_by: updatedBy,
      } as unknown as AttachmentPersistedAttributes;

      const updatedDoc = buildAttachmentDoc(makeSO(CASE_COMMENT_SAVED_OBJECT, withUpdate));
      expect(updatedDoc.updated_at).toBe('2026-05-02T10:00:00.000Z');
      expect(updatedDoc.updated_by).toEqual(updatedBy);

      const freshDoc = buildAttachmentDoc(makeSO(CASE_COMMENT_SAVED_OBJECT, fullUserAttrs));
      expect(freshDoc.updated_by).toBeNull();
      expect(freshDoc.pushed_by).toBeNull();
    });
  });

  describe('reference-id normalization', () => {
    it('dedupes repeated ids while preserving first-seen order', () => {
      // A multi-id alert can legitimately carry the same id more than once;
      // `attachment_id` is a keyword facet, so duplicates must collapse.
      const multiIdAlert = {
        type: AttachmentType.alert,
        alertId: ['dup-1', 'dup-1', 'dup-2'],
        index: '.alerts-security.alerts-default',
        rule: { id: 'rule-1', name: 'Rule' },
        owner: 'securitySolution',
        created_at: '2026-05-01T10:00:00.000Z',
        created_by: createdBy,
        updated_at: null,
        updated_by: null,
        pushed_at: null,
        pushed_by: null,
      } as unknown as AttachmentPersistedAttributes;

      const doc = buildAttachmentDoc(makeSO(CASE_COMMENT_SAVED_OBJECT, multiIdAlert));
      expect(doc.attachment.attachment_id).toEqual(['dup-1', 'dup-2']);
    });
  });

  describe('defensive fallback', () => {
    it('never throws on malformed attributes and emits a minimally-shaped doc', () => {
      // A shape the transformer can't route (empty attributes) must fall back
      // rather than crash the writer — a thrown builder would drop the whole
      // batch. `type` degrades to the `'unknown'` sentinel.
      const malformed = {} as unknown as UnifiedAttachmentAttributes;

      let doc: ReturnType<typeof buildAttachmentDoc> | undefined;
      expect(() => {
        doc = buildAttachmentDoc(makeSO(CASE_ATTACHMENT_SAVED_OBJECT, malformed));
      }).not.toThrow();
      expect(doc?.attachment.type).toBe('unknown');
    });
  });
});
