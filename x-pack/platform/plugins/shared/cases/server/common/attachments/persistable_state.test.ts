/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../common/types/domain';
import {
  LEGACY_LENS_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { persistableStateAttachmentTransformer } from './persistable_state';
import type { AttachmentRequestV2 } from '../../../common/types/api';

describe('persistableStateAttachmentTransformer', () => {
  const transformer = persistableStateAttachmentTransformer;

  it('converts legacy persistable state attributes to unified schema', () => {
    const legacy = {
      type: AttachmentType.persistableState,
      owner: 'securitySolution',
      persistableStateAttachmentTypeId: LEGACY_LENS_ATTACHMENT_TYPE,
      persistableStateAttachmentState: { attributes: { title: 'Lens title' } },
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: { username: 'elastic', full_name: null, email: null, profile_uid: 'abc' },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    const unified = transformer.toUnifiedSchema(legacy);

    expect(unified.type).toBe(LENS_ATTACHMENT_TYPE);
    expect(unified.data).toEqual({ state: legacy.persistableStateAttachmentState });
    expect(unified.owner).toBe(legacy.owner);
  });

  it('accepts legacy persistable attachments stored with unified type id', () => {
    const legacyWithUnifiedId = {
      type: AttachmentType.persistableState,
      owner: 'securitySolution',
      persistableStateAttachmentTypeId: LENS_ATTACHMENT_TYPE,
      persistableStateAttachmentState: { attributes: { title: 'Lens title' } },
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: { username: 'elastic', full_name: null, email: null, profile_uid: 'abc' },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    const unified = transformer.toUnifiedSchema(legacyWithUnifiedId);
    expect(unified.type).toBe(LENS_ATTACHMENT_TYPE);
    expect(unified.data).toEqual({ state: legacyWithUnifiedId.persistableStateAttachmentState });
  });

  it('converts unified schema back to legacy persistable state attributes', () => {
    const unified = {
      type: LENS_ATTACHMENT_TYPE,
      owner: 'securitySolution',
      data: {
        state: {
          attributes: { title: 'Lens title' },
        },
      },
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: { username: 'elastic', full_name: null, email: null, profile_uid: 'abc' },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    const legacy = transformer.toLegacySchema(unified);

    expect(legacy.type).toBe(AttachmentType.persistableState);
    expect(legacy.persistableStateAttachmentTypeId).toBe(LEGACY_LENS_ATTACHMENT_TYPE);
    expect(legacy.persistableStateAttachmentState).toEqual(unified.data.state);
  });

  it('does not treat non-Lens legacy persistable state as this transformer legacy payload', () => {
    const legacy = {
      type: AttachmentType.persistableState,
      owner: 'securitySolution',
      persistableStateAttachmentTypeId: '.test',
      persistableStateAttachmentState: {},
    };

    expect(transformer.isLegacyPayload(legacy as AttachmentRequestV2)).toBe(false);
    expect(transformer.isLegacyType(legacy)).toBe(false);
  });
});
