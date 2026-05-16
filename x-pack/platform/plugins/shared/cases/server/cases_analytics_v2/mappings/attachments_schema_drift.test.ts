/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { AttachmentType } from '../../../common/types/domain';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../../common/types/attachments_v2';
import { buildAttachmentDoc } from '../writer/attachments_doc_builder';
import { ATTACHMENTS_INDEX_MAPPING } from './attachments';

/**
 * Schema drift guards for the attachments surface — three layers,
 * mirroring the cases + activity drift tests with one extra
 * complication: the doc-builder accepts BOTH the legacy
 * `cases-comments` SO shape AND the unified `cases-attachments` SO
 * shape, then normalizes both into the analytics doc. Every fixture
 * below is exercised against both source paths.
 *
 * Layer 1 (doc-builder output ⊆ ATTACHMENTS_INDEX_MAPPING). Same as
 * the activity surface — the strict mapping rejects any field a
 * builder emits that isn't declared, surfacing as a silent ERROR-log
 * failure with no doc landed. This layer round-trips every per-subtype
 * fixture (legacy + unified) through `buildAttachmentDoc` and asserts
 * every emitted dotted path resolves in the mapping.
 *
 * Layer 2 (per-subtype curated extracts). The curated fields
 * (`attachment.comment`, `attachment.alert.rule.{id,name}`,
 * `attachment.alert.indices`, `attachment.actions.type`,
 * `attachment.external_reference.{type_id,storage_type}`,
 * `attachment.persistable_state.type_id`) are populated only for the
 * subtypes that own them. A regression that silently drops one of
 * these is otherwise invisible — docs still pass strict mapping, they
 * just lose analytics dimensions. This layer pins the per-subtype
 * contract.
 *
 * Layer 3 (every-subtype-has-a-fixture). The `AttachmentType` enum is
 * the canonical list of legacy subtypes; the unified shape adds
 * plugin-registered open-vocabulary types. We pin one fixture per
 * legacy subtype + a representative unified fixture so adding a new
 * legacy subtype without an entry here fails a sanity test below.
 */

// ----- Mapping-walking helpers (mirrors activity drift test) -----

const flatten = (doc: unknown, prefix = ''): string[] => {
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) {
    return prefix ? [prefix] : [];
  }
  const keys: string[] = [];
  for (const [k, v] of Object.entries(doc as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
};

const collectMappedPaths = (mapping: MappingTypeMapping): Set<string> => {
  const out = new Set<string>();
  const walk = (node: Record<string, MappingProperty>, prefix: string): void => {
    for (const [k, prop] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.add(path);
      const stopAtParent =
        (prop as { enabled?: boolean }).enabled === false ||
        (prop as { dynamic?: boolean | string }).dynamic === true;
      if (!stopAtParent) {
        const props = (prop as { properties?: Record<string, MappingProperty> }).properties;
        if (props) walk(props, path);
      }
    }
  };
  if (mapping.properties) walk(mapping.properties, '');
  return out;
};

const isCovered = (path: string, mappedPaths: Set<string>): boolean => {
  if (mappedPaths.has(path)) return true;
  let p = path;
  while (true) {
    const idx = p.lastIndexOf('.');
    if (idx < 0) break;
    p = p.slice(0, idx);
    if (mappedPaths.has(p)) return true;
  }
  return false;
};

// ----- SO fixture builders -----

const baseCommonAttrs = {
  owner: 'securitySolution',
  created_at: '2026-05-01T10:00:00.000Z',
  created_by: { username: 'jane', full_name: 'J', email: 'j@e.com', profile_uid: 'p-1' },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

const caseRef: SavedObjectReference = {
  id: 'case-1',
  type: CASE_SAVED_OBJECT,
  name: 'associated-cases',
};

const makeLegacySO = (
  id: string,
  attrs: Partial<AttachmentPersistedAttributes>
): SavedObject<AttachmentPersistedAttributes> =>
  ({
    type: CASE_COMMENT_SAVED_OBJECT,
    id,
    namespaces: ['default'],
    references: [caseRef],
    attributes: { ...baseCommonAttrs, ...attrs } as AttachmentPersistedAttributes,
  } as SavedObject<AttachmentPersistedAttributes>);

const makeUnifiedSO = (
  id: string,
  attrs: Partial<UnifiedAttachmentAttributes>
): SavedObject<UnifiedAttachmentAttributes> =>
  ({
    type: CASE_ATTACHMENT_SAVED_OBJECT,
    id,
    namespaces: ['default'],
    references: [caseRef],
    attributes: { ...baseCommonAttrs, ...attrs } as UnifiedAttachmentAttributes,
  } as SavedObject<UnifiedAttachmentAttributes>);

// ----- Per-subtype fixtures (legacy + unified per subtype) -----
//
// Each subtype gets one realistic legacy fixture and one realistic
// unified fixture so Layer 1 + Layer 2 exercise both source paths.
// The shapes are taken from the persisted-attribute types in
// `common/types/attachments_v1.ts` and the unified domain types in
// `common/types/domain/attachment/v2.ts` — adding a new field on
// either source shape and forgetting to update the doc-builder /
// mapping fails the matching layer.

const FIXTURES = {
  user_legacy: makeLegacySO('user-legacy', {
    type: AttachmentType.user,
    comment: 'Looking into this now',
  } as Partial<AttachmentPersistedAttributes>),
  user_unified: makeUnifiedSO('user-unified', {
    type: 'comment',
    data: { content: 'Looking into this now' },
  } as Partial<UnifiedAttachmentAttributes>),

  alert_legacy: makeLegacySO('alert-legacy', {
    type: AttachmentType.alert,
    alertId: 'alert-123',
    index: '.alerts-security.alerts-default',
    rule: { id: 'rule-1', name: 'Suspicious activity' },
  } as Partial<AttachmentPersistedAttributes>),
  alert_unified: makeUnifiedSO('alert-unified', {
    type: 'securityAlert',
    attachmentId: ['alert-123', 'alert-456'],
    metadata: {
      index: ['.alerts-security.alerts-default'],
      rule: { id: 'rule-1', name: 'Suspicious activity' },
    },
  } as unknown as Partial<UnifiedAttachmentAttributes>),

  actions_legacy: makeLegacySO('actions-legacy', {
    type: AttachmentType.actions,
    comment: 'Isolating endpoint',
    actions: {
      targets: [{ hostname: 'host-1', endpointId: 'ep-1' }],
      type: 'isolate',
    },
  } as unknown as Partial<AttachmentPersistedAttributes>),
  actions_unified: makeUnifiedSO('actions-unified', {
    type: 'security.endpoint',
    attachmentId: 'action-1',
    metadata: { actionType: 'isolate' },
  } as unknown as Partial<UnifiedAttachmentAttributes>),

  externalReference_legacy: makeLegacySO('extref-legacy', {
    type: AttachmentType.externalReference,
    externalReferenceAttachmentTypeId: '.files',
    externalReferenceId: 'file-1',
    externalReferenceStorage: { type: 'savedObject', soType: 'cases-files' },
    externalReferenceMetadata: { filename: 'evidence.pdf', mimeType: 'application/pdf' },
  } as unknown as Partial<AttachmentPersistedAttributes>),
  externalReference_unified: makeUnifiedSO('extref-unified', {
    type: 'security.endpoint',
    attachmentId: 'file-1',
    metadata: { filename: 'evidence.pdf', mimeType: 'application/pdf' },
  } as unknown as Partial<UnifiedAttachmentAttributes>),

  persistableState_legacy: makeLegacySO('ps-legacy', {
    type: AttachmentType.persistableState,
    persistableStateAttachmentTypeId: '.lens',
    persistableStateAttachmentState: { visualizationType: 'lnsXY', state: { datasourceStates: {} } },
  } as unknown as Partial<AttachmentPersistedAttributes>),
  persistableState_unified: makeUnifiedSO('ps-unified', {
    type: 'lens',
    data: { visualizationType: 'lnsXY', state: { datasourceStates: {} } },
  } as unknown as Partial<UnifiedAttachmentAttributes>),
} as const;

// ----- Layer 1: doc-builder output ⊆ attachments mapping -----

describe('attachments mapping covers every doc-builder field for every fixture', () => {
  const mappedPaths = collectMappedPaths(ATTACHMENTS_INDEX_MAPPING);

  it.each(Object.entries(FIXTURES))(
    'fixture=%s emits only mapped fields',
    (_label, so) => {
      const doc = buildAttachmentDoc(
        so as SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>
      );
      const missing = flatten(doc).filter((p) => !isCovered(p, mappedPaths));
      expect(missing).toEqual([]);
    }
  );
});

// ----- Layer 2: per-subtype curated extracts -----

describe('per-subtype curated extracts', () => {
  it('user (legacy + unified): populates attachment.comment from data.content / comment', () => {
    expect(buildAttachmentDoc(FIXTURES.user_legacy).attachment.comment).toBe(
      'Looking into this now'
    );
    expect(buildAttachmentDoc(FIXTURES.user_unified).attachment.comment).toBe(
      'Looking into this now'
    );
  });

  it('alert (legacy): populates attachment.alert.rule + indices from top-level fields', () => {
    const doc = buildAttachmentDoc(FIXTURES.alert_legacy);
    expect(doc.attachment.alert?.rule).toEqual({ id: 'rule-1', name: 'Suspicious activity' });
    expect(doc.attachment.alert?.indices).toEqual(['.alerts-security.alerts-default']);
    expect(doc.attachment.attachment_id).toEqual(['alert-123']);
  });

  it('alert (unified): populates attachment.alert.rule + indices from metadata.*', () => {
    const doc = buildAttachmentDoc(FIXTURES.alert_unified);
    expect(doc.attachment.alert?.rule).toEqual({ id: 'rule-1', name: 'Suspicious activity' });
    expect(doc.attachment.alert?.indices).toEqual(['.alerts-security.alerts-default']);
    // attachmentId arrives as string[] (multi-id alert); doc-builder
    // preserves the array.
    expect(doc.attachment.attachment_id).toEqual(['alert-123', 'alert-456']);
  });

  it('actions (legacy): populates attachment.actions.type and attachment.comment', () => {
    const doc = buildAttachmentDoc(FIXTURES.actions_legacy);
    expect(doc.attachment.actions?.type).toBe('isolate');
    expect(doc.attachment.comment).toBe('Isolating endpoint');
  });

  it('externalReference (legacy): populates external_reference.type_id + storage_type', () => {
    const doc = buildAttachmentDoc(FIXTURES.externalReference_legacy);
    expect(doc.attachment.external_reference?.type_id).toBe('.files');
    expect(doc.attachment.external_reference?.storage_type).toBe('savedObject');
  });

  it('externalReference (unified): unified subtype name carries the type_id signal', () => {
    const doc = buildAttachmentDoc(FIXTURES.externalReference_unified);
    // After legacy → unified normalization the legacy
    // `externalReferenceAttachmentTypeId` is replaced by the unified
    // `type` field; the `external_reference.type_id` curated extract
    // is therefore absent on unified-only fixtures. Track the type via
    // `attachment.type`.
    expect(doc.attachment.type).toBe('security.endpoint');
    expect(doc.attachment.external_reference).toBeUndefined();
  });

  it('persistableState (legacy): populates persistable_state.type_id', () => {
    const doc = buildAttachmentDoc(FIXTURES.persistableState_legacy);
    expect(doc.attachment.persistable_state?.type_id).toBe('.lens');
  });
});

// ----- Layer 3: every legacy subtype has a fixture -----

describe('every legacy AttachmentType has at least one fixture', () => {
  it('PER_SUBTYPE_FIXTURES covers every value of AttachmentType', () => {
    const fixtureSubtypeKeys = Object.keys(FIXTURES)
      .filter((k) => k.endsWith('_legacy'))
      .map((k) => k.replace('_legacy', ''));
    // `event` is intentionally excluded — it shares the alert builder
    // path on both legacy and unified sides; alert coverage is sufficient.
    const expectedSubtypes = Object.values(AttachmentType).filter((t) => t !== 'event');
    for (const subtype of expectedSubtypes) {
      expect(fixtureSubtypeKeys).toContain(subtype);
    }
  });
});

// ----- Cases.id denormalization sanity -----

describe('cases.id is denormalized from references[case]', () => {
  it.each(Object.entries(FIXTURES))('fixture=%s carries cases.id from the SO reference', (_label, so) => {
    const doc = buildAttachmentDoc(
      so as SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>
    );
    expect(doc.cases.id).toBe('case-1');
  });
});

// ----- @timestamp + ownership pass-through -----

describe('common fields pass through unchanged', () => {
  it('every fixture: @timestamp = created_at, owner from attributes, kibana.space_ids from namespaces', () => {
    for (const [, so] of Object.entries(FIXTURES)) {
      const doc = buildAttachmentDoc(
        so as SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>
      );
      expect(doc['@timestamp']).toBe('2026-05-01T10:00:00.000Z');
      expect(doc.owner).toBe('securitySolution');
      expect(doc.kibana.space_ids).toEqual(['default']);
    }
  });
});
