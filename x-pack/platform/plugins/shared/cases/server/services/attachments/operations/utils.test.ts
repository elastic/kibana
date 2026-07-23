/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertLegacyWriteableAttachmentType, transformAttributesForMode } from './utils';
import { isUnifiedOnlyAttachment } from '../../type_guards';
import { createUserAttachment } from '../test_utils';
import {
  AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  INDICATOR_ATTACHMENT_TYPE,
  LEGACY_LENS_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  LENS_SO_TYPE,
  ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
  OSQUERY_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  SECURITY_TIMELINE_ATTACHMENT_TYPE,
} from '../../../../common/constants';
import { AttachmentType } from '../../../../common/types/domain';

const basicAttributes = {
  created_at: '2026-05-29T00:00:00.000Z',
  created_by: { username: 'tester', full_name: null, email: null },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

const createByValueLens = () =>
  ({
    type: LENS_ATTACHMENT_TYPE,
    owner: 'cases',
    data: { state: { visualization: {} } },
    ...basicAttributes,
  } as unknown as Parameters<typeof transformAttributesForMode>[0]['attributes']);

// A saved-object reference lens carries `metadata.soType` and, optionally, a
// snapshot of the referenced SO under `data.attributes`. It has no by-value
// legacy form.
const createByReferenceLens = (withSnapshot = false) =>
  ({
    type: LENS_ATTACHMENT_TYPE,
    owner: 'cases',
    attachmentId: 'lens-1',
    metadata: { title: 'My lens', soType: LENS_SO_TYPE },
    ...(withSnapshot ? { data: { attributes: { title: 'My lens' } } } : {}),
    ...basicAttributes,
  } as unknown as Parameters<typeof transformAttributesForMode>[0]['attributes']);

// A unified file attachment is SO-backed (`metadata.soType`) but, unlike Lens-by-ref,
// maps cleanly onto a legacy externalReference, so it must stay legacy-writeable.
const createUnifiedFile = () =>
  ({
    type: FILE_ATTACHMENT_TYPE,
    owner: 'cases',
    attachmentId: 'file-1',
    metadata: {
      soType: 'file',
      files: [
        { name: 'test.txt', extension: 'txt', mimeType: 'text/plain', created: '2026-05-29' },
      ],
    },
    ...basicAttributes,
  } as unknown as Parameters<typeof transformAttributesForMode>[0]['attributes']);

// Every unified type that maps onto a legacy externalReference. These are SO-backed
// (`metadata.soType`) yet always have a legacy form, so they are never unified-only.
const externalReferenceTypes = [
  ['endpoint', SECURITY_ENDPOINT_ATTACHMENT_TYPE],
  ['file', FILE_ATTACHMENT_TYPE],
  ['osquery', OSQUERY_ATTACHMENT_TYPE],
  ['indicator', INDICATOR_ATTACHMENT_TYPE],
] as const;

const createExternalReference = (type: string) =>
  ({
    type,
    owner: 'cases',
    attachmentId: `${type}-1`,
    metadata: { soType: type },
    ...basicAttributes,
  } as unknown as Parameters<typeof transformAttributesForMode>[0]['attributes']);

// Every persistable-state subtype. Their legacy form is by-value, so a by-value
// instance is legacy-writeable (only a by-reference instance would be unified-only).
const persistableStateTypes = [
  ['lens', LENS_ATTACHMENT_TYPE],
  ['ml anomaly swimlane', ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE],
  ['aiops change point chart', AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE],
] as const;

const createByValuePersistableState = (type: string) =>
  ({
    type,
    owner: 'cases',
    data: { state: {} },
    ...basicAttributes,
  } as unknown as Parameters<typeof transformAttributesForMode>[0]['attributes']);

describe('transformAttributesForMode', () => {
  it('maps legacy user comments to unified schema when mode is unified', () => {
    const attrs = createUserAttachment().attributes;
    const out = transformAttributesForMode({ attributes: attrs, mode: 'unified' });
    expect(out.isUnified).toBe(true);
    if (out.isUnified) {
      expect(out.attributes.type).toBe('comment');
      expect(out.attributes.data?.content).toBe(attrs.comment);
    }
  });

  it('keeps legacy shape when mode is legacy', () => {
    const attrs = createUserAttachment().attributes;
    const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
    expect(out.isUnified).toBe(false);
    if (!out.isUnified) {
      expect(out.attributes.type).toBe('user');
      expect(out.attributes.comment).toBe(attrs.comment);
    }
  });

  // Net-new unified types (no v1 equivalent) must stay in the unified branch even when
  // the caller asks for legacy mode, otherwise the legacy decoder rejects them.
  it('keeps unified-only types (security.timeline) on the unified branch in legacy mode', () => {
    const attrs = {
      type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
      attachmentId: 'timeline-1',
      owner: 'securitySolution',
      metadata: { title: 'My timeline' },
      created_at: '2024-01-01T00:00:00.000Z',
      created_by: { username: 'elastic', full_name: null, email: null, profile_uid: undefined },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    } as unknown as Parameters<typeof transformAttributesForMode>[0]['attributes'];

    const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
    expect(out.isUnified).toBe(true);
    if (out.isUnified) {
      expect(out.attributes).toMatchObject({
        type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
        attachmentId: 'timeline-1',
        owner: 'securitySolution',
        metadata: { title: 'My timeline' },
      });
    }
  });

  // Unified-only types (dashboard, map, discoverSession) have no v1 equivalent,
  // so transformAttributesForMode must surface them as unified even when called
  // with mode=legacy — otherwise the legacy decoder rejects them.
  it('keeps a unified-only reference payload (dashboard) on the unified branch in legacy mode', () => {
    const attrs = {
      type: 'dashboard',
      owner: 'cases',
      attachmentId: 'dash-1',
      metadata: { title: 'My dashboard', soType: 'dashboard' },
      created_at: '2026-05-29T00:00:00.000Z',
      created_by: { username: 'tester', full_name: null, email: null },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    } as unknown as Parameters<typeof transformAttributesForMode>[0]['attributes'];
    const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
    expect(out.isUnified).toBe(true);
    if (out.isUnified) {
      expect(out.attributes.type).toBe('dashboard');
    }
  });

  it('keeps a unified-only reference payload (discoverSession) on the unified branch in legacy mode', () => {
    const attrs = {
      type: 'discoverSession',
      owner: 'cases',
      attachmentId: 'search-1',
      metadata: { title: 'Saved search', soType: 'search' },
      created_at: '2026-05-29T00:00:00.000Z',
      created_by: { username: 'tester', full_name: null, email: null },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    } as unknown as Parameters<typeof transformAttributesForMode>[0]['attributes'];
    const out = transformAttributesForMode({ attributes: attrs, mode: 'legacy' });
    expect(out.isUnified).toBe(true);
    if (out.isUnified) {
      expect(out.attributes.type).toBe('discoverSession');
    }
  });

  // By-value lens keeps a legacy `persistableState` representation, so mode=legacy
  // must still downgrade it (this is the pre-existing hybrid behavior).
  it('downgrades by-value lens to legacy persistableState in legacy mode', () => {
    const out = transformAttributesForMode({ attributes: createByValueLens(), mode: 'legacy' });
    expect(out.isUnified).toBe(false);
    if (!out.isUnified) {
      expect(out.attributes.type).toBe(AttachmentType.persistableState);
      expect(out.attributes.persistableStateAttachmentTypeId).toBe(LEGACY_LENS_ATTACHMENT_TYPE);
    }
  });

  // Files are SO-backed but have a legacy externalReference form, so mode=legacy
  // must downgrade them rather than keep them unified.
  it('downgrades a unified file to legacy externalReference in legacy mode', () => {
    const out = transformAttributesForMode({ attributes: createUnifiedFile(), mode: 'legacy' });
    expect(out.isUnified).toBe(false);
    if (!out.isUnified) {
      expect(out.attributes.type).toBe(AttachmentType.externalReference);
    }
  });

  // A Lens-by-reference instance has no by-value legacy form, so it must stay on
  // the unified branch even for mode=legacy — otherwise toLegacySchema would
  // fabricate a bogus persistableState from the snapshot and drop attachmentId.
  it.each([
    ['without a data snapshot', false],
    ['with a data snapshot', true],
  ])('keeps a Lens-by-reference attachment unified in legacy mode (%s)', (_desc, withSnapshot) => {
    const out = transformAttributesForMode({
      attributes: createByReferenceLens(withSnapshot as boolean),
      mode: 'legacy',
    });
    expect(out.isUnified).toBe(true);
    if (out.isUnified) {
      expect(out.attributes).toMatchObject({
        type: LENS_ATTACHMENT_TYPE,
        attachmentId: 'lens-1',
        metadata: { soType: LENS_SO_TYPE },
      });
    }
  });
});

describe('isUnifiedOnlyAttachment', () => {
  it('is false for legacy user comments', () => {
    expect(isUnifiedOnlyAttachment(createUserAttachment().attributes)).toBe(false);
  });

  // External-reference-mapped types are SO-backed (`metadata.soType`) but always have a
  // legacy externalReference form. Flagging them unified-only broke every file write with
  // the flag off, so guard the whole map (endpoint/file/osquery/indicator).
  it.each(externalReferenceTypes)(
    'is false for a unified %s attachment (has a legacy externalReference form)',
    (_desc, type) => {
      expect(isUnifiedOnlyAttachment(createExternalReference(type))).toBe(false);
    }
  );

  it.each(persistableStateTypes)(
    'is false for by-value %s (has a legacy persistableState form)',
    (_desc, type) => {
      expect(isUnifiedOnlyAttachment(createByValuePersistableState(type))).toBe(false);
    }
  );

  // A by-reference persistable-state instance (only Lens supports this today) has no
  // by-value legacy counterpart, so it is the one persistable case that is unified-only.
  it('is true for a Lens-by-reference attachment (no legacy form)', () => {
    expect(isUnifiedOnlyAttachment(createByReferenceLens())).toBe(true);
    expect(isUnifiedOnlyAttachment(createByReferenceLens(true))).toBe(true);
  });

  // Runs on the raw request body (before decode), so a payload whose type can't be
  // resolved must return false rather than throw — otherwise the route 500s instead of
  // letting validation reject it with a 400.
  it.each([
    ['missing type', { owner: 'cases' }],
    ['non-object', 'not-an-object'],
    ['null', null],
  ])('is false and does not throw for a malformed payload (%s)', (_desc, payload) => {
    expect(() =>
      isUnifiedOnlyAttachment(payload as unknown as Record<string, unknown>)
    ).not.toThrow();
    expect(isUnifiedOnlyAttachment(payload as unknown as Record<string, unknown>)).toBe(false);
  });
});

describe('assertLegacyWriteableAttachmentType', () => {
  it('does not throw for by-value lens', () => {
    expect(() => assertLegacyWriteableAttachmentType(createByValueLens())).not.toThrow();
  });

  it('does not throw for legacy user comments', () => {
    expect(() =>
      assertLegacyWriteableAttachmentType(createUserAttachment().attributes)
    ).not.toThrow();
  });

  it('throws a 400 for a Lens-by-reference attachment', () => {
    expect(() => assertLegacyWriteableAttachmentType(createByReferenceLens())).toThrow(
      /has no legacy representation/
    );
  });

  it('does not throw for a unified file attachment', () => {
    expect(() => assertLegacyWriteableAttachmentType(createUnifiedFile())).not.toThrow();
  });
});
