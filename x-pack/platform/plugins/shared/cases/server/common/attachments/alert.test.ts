/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER } from '../../../common/constants';
import { AttachmentType } from '../../../common/types/domain';
import type {
  AttachmentAttributesV2,
  UnifiedReferenceAttachmentPayload,
} from '../../../common/types/domain/attachment/v2';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { alertAttachmentTransformer } from './alert';

describe('alert attachment transformer', () => {
  describe('toUnifiedPayload', () => {
    it('converts a legacy payload to unified payload (singular ids)', () => {
      const payload = alertAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.alert,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: 'rule-1', name: 'Test Rule' },
      });

      expect(payload).toEqual({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
        metadata: {
          index: 'index-1',
          rule: { id: 'rule-1', name: 'Test Rule' },
        },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('preserves legacy alert id and index arrays on the unified payload', () => {
      const payload = alertAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.alert,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: ['alert-1', 'alert-2'],
        index: ['index-1', 'index-2'],
        rule: { id: 'rule-1', name: 'Test Rule' },
      });

      expect(payload).toEqual({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1', 'alert-2'],
        metadata: {
          index: ['index-1', 'index-2'],
          rule: { id: 'rule-1', name: 'Test Rule' },
        },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('preserves single-item arrays so alert id and index round-trip to the same shape', () => {
      const payload = alertAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.alert,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: ['alert-1'],
        index: ['index-1'],
        rule: { id: 'rule-1', name: 'Test Rule' },
      });

      expect(payload).toEqual({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1'],
        metadata: {
          index: ['index-1'],
          rule: { id: 'rule-1', name: 'Test Rule' },
        },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('maps observability owner to observability.alert type', () => {
      const payload = alertAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.alert,
        owner: OBSERVABILITY_OWNER,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: null, name: null },
      });

      expect(payload).toEqual({
        type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
        metadata: {
          index: 'index-1',
          rule: { id: null, name: null },
        },
        owner: OBSERVABILITY_OWNER,
      });
    });

    it('omits metadata when index and rule are both absent', () => {
      const payload = alertAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.alert,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: 'rule-1', name: 'Test Rule' },
      });

      expect(payload.metadata).toBeDefined();

      const payloadNoRule = alertAttachmentTransformer.toUnifiedPayload({
        type: AttachmentType.alert,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: 'alert-1',
        index: 'index-1',
        rule: undefined as unknown as { id: string | null; name: string | null },
      });

      expect(payloadNoRule.metadata).toEqual({ index: 'index-1' });
    });
  });

  describe('toUnifiedSchema', () => {
    it('maps legacy persisted attributes with alert arrays to unified shape', () => {
      const attrs = alertAttachmentTransformer.toUnifiedSchema({
        type: AttachmentType.alert,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: ['a', 'b'],
        index: ['i1', 'i2'],
        rule: { id: 'rule-1', name: 'Test Rule' },
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: {
          username: 'u',
          full_name: null,
          email: null,
          profile_uid: undefined,
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      });

      expect(attrs).toMatchObject({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['a', 'b'],
        metadata: { index: ['i1', 'i2'], rule: { id: 'rule-1', name: 'Test Rule' } },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('passes through already-unified attributes', () => {
      const unified = {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
        metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'Test Rule' } },
        owner: SECURITY_SOLUTION_OWNER,
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: {
          username: 'u',
          full_name: null,
          email: null,
          profile_uid: undefined,
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      };

      const attrs = alertAttachmentTransformer.toUnifiedSchema(unified);
      expect(attrs).toEqual(unified);
    });
  });

  describe('toLegacySchema', () => {
    it('converts unified attributes back to legacy shape', () => {
      const attrs = alertAttachmentTransformer.toLegacySchema({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
        metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'Test Rule' } },
        owner: SECURITY_SOLUTION_OWNER,
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: {
          username: 'u',
          full_name: null,
          email: null,
          profile_uid: undefined,
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      });

      expect(attrs).toMatchObject({
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: 'rule-1', name: 'Test Rule' },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('defaults rule to null fields when metadata has no rule', () => {
      const attrs = alertAttachmentTransformer.toLegacySchema({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
        metadata: { index: 'index-1' },
        owner: SECURITY_SOLUTION_OWNER,
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: {
          username: 'u',
          full_name: null,
          email: null,
          profile_uid: undefined,
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      });

      expect(attrs).toMatchObject({
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: null, name: null },
      });
    });

    it('passes through already-legacy attributes', () => {
      const legacy = {
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: 'rule-1', name: 'Test Rule' },
        owner: SECURITY_SOLUTION_OWNER,
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: {
          username: 'u',
          full_name: null,
          email: null,
          profile_uid: undefined,
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      };

      const attrs = alertAttachmentTransformer.toLegacySchema(legacy);
      expect(attrs).toEqual(legacy);
    });

    it('defaults index to empty string when metadata.index is missing', () => {
      const attrs = alertAttachmentTransformer.toLegacySchema({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
        metadata: { rule: { id: 'rule-1', name: 'Test Rule' } },
        owner: SECURITY_SOLUTION_OWNER,
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: {
          username: 'u',
          full_name: null,
          email: null,
          profile_uid: undefined,
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      });

      expect(attrs).toMatchObject({
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: '',
        rule: { id: 'rule-1', name: 'Test Rule' },
      });
    });
  });

  describe('toLegacyPayload', () => {
    it('defaults index to empty string when metadata.index is missing', () => {
      const payload = alertAttachmentTransformer.toLegacyPayload({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        owner: SECURITY_SOLUTION_OWNER,
        attachmentId: 'alert-1',
      } as UnifiedReferenceAttachmentPayload);

      expect(payload).toEqual({
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: '',
        rule: { id: null, name: null },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('converts unified payload back to legacy shape', () => {
      const payload = alertAttachmentTransformer.toLegacyPayload({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        owner: SECURITY_SOLUTION_OWNER,
        attachmentId: 'alert-1',
        metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'Test Rule' } },
      });

      expect(payload).toEqual({
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: 'rule-1', name: 'Test Rule' },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('defaults rule to null fields when metadata has no rule', () => {
      const payload = alertAttachmentTransformer.toLegacyPayload({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        owner: SECURITY_SOLUTION_OWNER,
        attachmentId: 'alert-1',
        metadata: { index: 'index-1' },
      });

      expect(payload).toEqual({
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: null, name: null },
        owner: SECURITY_SOLUTION_OWNER,
      });
    });
  });

  describe('isType / isLegacyType / isUnifiedType', () => {
    const legacyAttrs = {
      type: AttachmentType.alert,
      alertId: 'alert-1',
      index: 'index-1',
      rule: { id: 'rule-1', name: 'Test Rule' },
      owner: SECURITY_SOLUTION_OWNER,
      created_at: '2020-01-01T00:00:00.000Z',
      created_by: { username: 'u', full_name: null, email: null, profile_uid: undefined },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    const unifiedAttrs = {
      type: SECURITY_ALERT_ATTACHMENT_TYPE,
      attachmentId: 'alert-1',
      metadata: { index: 'index-1', rule: { id: 'rule-1', name: 'Test Rule' } },
      owner: SECURITY_SOLUTION_OWNER,
      created_at: '2020-01-01T00:00:00.000Z',
      created_by: { username: 'u', full_name: null, email: null, profile_uid: undefined },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('isType returns true for legacy alert attributes', () => {
      expect(
        alertAttachmentTransformer.isType(legacyAttrs as unknown as AttachmentAttributesV2)
      ).toBe(true);
    });

    it('isType returns true for unified alert attributes', () => {
      expect(
        alertAttachmentTransformer.isType(unifiedAttrs as unknown as AttachmentAttributesV2)
      ).toBe(true);
    });

    it('isLegacyType returns true only for legacy', () => {
      expect(alertAttachmentTransformer.isLegacyType(legacyAttrs)).toBe(true);
      expect(alertAttachmentTransformer.isLegacyType(unifiedAttrs)).toBe(false);
    });

    it('isUnifiedType returns true only for unified', () => {
      expect(alertAttachmentTransformer.isUnifiedType(unifiedAttrs)).toBe(true);
      expect(alertAttachmentTransformer.isUnifiedType(legacyAttrs)).toBe(false);
    });
  });

  describe('round-trip toUnifiedSchema -> toLegacySchema', () => {
    const baseLegacyCommon = {
      created_at: '2020-01-01T00:00:00.000Z',
      created_by: {
        username: 'u',
        full_name: null,
        email: null,
        profile_uid: undefined,
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };

    it('rule present, scalar id', () => {
      const legacy = {
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: 'rule-1', name: 'Test Rule' },
        owner: SECURITY_SOLUTION_OWNER,
        ...baseLegacyCommon,
      };

      const unified = alertAttachmentTransformer.toUnifiedSchema(legacy);
      const legacyAgain = alertAttachmentTransformer.toLegacySchema(unified);

      expect(legacyAgain).toEqual(legacy);
    });

    it('rule present, array id', () => {
      const legacy = {
        type: AttachmentType.alert,
        alertId: ['alert-1', 'alert-2'],
        index: ['index-1', 'index-2'],
        rule: { id: 'rule-1', name: 'Test Rule' },
        owner: SECURITY_SOLUTION_OWNER,
        ...baseLegacyCommon,
      };

      const unified = alertAttachmentTransformer.toUnifiedSchema(legacy);
      const legacyAgain = alertAttachmentTransformer.toLegacySchema(unified);

      expect(legacyAgain).toEqual(legacy);
    });

    it('rule absent (defaults to {id: null, name: null}) — scalar id', () => {
      const legacy = {
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: null, name: null },
        owner: SECURITY_SOLUTION_OWNER,
        ...baseLegacyCommon,
      };

      const unified = alertAttachmentTransformer.toUnifiedSchema(legacy);
      const legacyAgain = alertAttachmentTransformer.toLegacySchema(unified);

      expect(legacyAgain).toEqual(legacy);
    });

    it('rule absent (defaults to {id: null, name: null}) — array id', () => {
      const legacy = {
        type: AttachmentType.alert,
        alertId: ['alert-1', 'alert-2', 'alert-3'],
        index: ['index-1', 'index-2', 'index-3'],
        rule: { id: null, name: null },
        owner: OBSERVABILITY_OWNER,
        ...baseLegacyCommon,
      };

      const unified = alertAttachmentTransformer.toUnifiedSchema(legacy);
      const legacyAgain = alertAttachmentTransformer.toLegacySchema(unified);

      expect(legacyAgain).toEqual(legacy);
    });
  });

  describe('round-trip toUnifiedPayload -> toLegacyPayload', () => {
    it('rule present, scalar id', () => {
      const legacy = {
        type: AttachmentType.alert as const,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: 'rule-1', name: 'Test Rule' },
      };

      const unified = alertAttachmentTransformer.toUnifiedPayload(legacy);
      const legacyAgain = alertAttachmentTransformer.toLegacyPayload(unified);

      expect(legacyAgain).toEqual(legacy);
    });

    it('rule present, array id', () => {
      const legacy = {
        type: AttachmentType.alert as const,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: ['alert-1', 'alert-2'],
        index: ['index-1', 'index-2'],
        rule: { id: 'rule-1', name: 'Test Rule' },
      };

      const unified = alertAttachmentTransformer.toUnifiedPayload(legacy);
      const legacyAgain = alertAttachmentTransformer.toLegacyPayload(unified);

      expect(legacyAgain).toEqual(legacy);
    });

    it('rule absent — scalar id', () => {
      const legacy = {
        type: AttachmentType.alert as const,
        owner: SECURITY_SOLUTION_OWNER,
        alertId: 'alert-1',
        index: 'index-1',
        rule: { id: null, name: null },
      };

      const unified = alertAttachmentTransformer.toUnifiedPayload(legacy);
      const legacyAgain = alertAttachmentTransformer.toLegacyPayload(unified);

      expect(legacyAgain).toEqual(legacy);
    });

    it('rule absent — array id', () => {
      const legacy = {
        type: AttachmentType.alert as const,
        owner: OBSERVABILITY_OWNER,
        alertId: ['alert-1', 'alert-2'],
        index: ['index-1', 'index-2'],
        rule: { id: null, name: null },
      };

      const unified = alertAttachmentTransformer.toUnifiedPayload(legacy);
      const legacyAgain = alertAttachmentTransformer.toLegacyPayload(unified);

      expect(legacyAgain).toEqual(legacy);
    });
  });
});
