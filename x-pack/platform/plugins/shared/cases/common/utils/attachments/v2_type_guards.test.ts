/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
  SECURITY_ENTITY_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
} from '../../constants/attachments';
import { AttachmentType } from '../../types/domain';
import type { AttachmentRequestV2 } from '../../types/api';
import {
  isAlertAttachmentType,
  isAttackAttachmentType,
  isUnifiedAttackAttachment,
  UNIFIED_ALERT_TYPES,
} from './v2_type_guards';

describe('v2 type guards', () => {
  describe('isAlertAttachmentType', () => {
    it('is true for the legacy alert type and every unified alert type', () => {
      expect(isAlertAttachmentType(AttachmentType.alert)).toBe(true);
      expect(isAlertAttachmentType(SECURITY_ALERT_ATTACHMENT_TYPE)).toBe(true);
      expect(isAlertAttachmentType(OBSERVABILITY_ALERT_ATTACHMENT_TYPE)).toBe(true);
      expect(isAlertAttachmentType(STACK_ALERT_ATTACHMENT_TYPE)).toBe(true);
    });

    it('is false for non-alert unified types', () => {
      // Attacks are their own attachment type; counting them as alerts would be wrong.
      expect(isAlertAttachmentType(SECURITY_ATTACK_ATTACHMENT_TYPE)).toBe(false);
      expect(isAlertAttachmentType(SECURITY_ENTITY_ATTACHMENT_TYPE)).toBe(false);
      expect(isAlertAttachmentType('something-custom')).toBe(false);
    });
  });

  describe('isAttackAttachmentType', () => {
    it('is true only for security.attack', () => {
      expect(isAttackAttachmentType(SECURITY_ATTACK_ATTACHMENT_TYPE)).toBe(true);
    });

    it('is false for alert types and the legacy alert type', () => {
      expect(isAttackAttachmentType(AttachmentType.alert)).toBe(false);
      expect(isAttackAttachmentType(SECURITY_ALERT_ATTACHMENT_TYPE)).toBe(false);
      expect(isAttackAttachmentType(OBSERVABILITY_ALERT_ATTACHMENT_TYPE)).toBe(false);
      expect(isAttackAttachmentType(STACK_ALERT_ATTACHMENT_TYPE)).toBe(false);
      expect(isAttackAttachmentType(SECURITY_ENTITY_ATTACHMENT_TYPE)).toBe(false);
      expect(isAttackAttachmentType('something-custom')).toBe(false);
    });

    it('leaves UNIFIED_ALERT_TYPES untouched', () => {
      expect(UNIFIED_ALERT_TYPES.has(SECURITY_ATTACK_ATTACHMENT_TYPE)).toBe(false);
      expect(UNIFIED_ALERT_TYPES.size).toBe(3);
    });
  });

  describe('isUnifiedAttackAttachment', () => {
    it('is true for a reference attachment of type security.attack', () => {
      expect(
        isUnifiedAttackAttachment({
          type: SECURITY_ATTACK_ATTACHMENT_TYPE,
          owner: 'securitySolution',
          attachmentId: 'attack-1',
          metadata: { index: '.alerts-security.attack.discovery.alerts-default' },
        } as AttachmentRequestV2)
      ).toBe(true);
    });

    it('is false for a value attachment and for other reference types', () => {
      expect(
        isUnifiedAttackAttachment({
          type: SECURITY_ATTACK_ATTACHMENT_TYPE,
          owner: 'securitySolution',
          data: { content: 'not a reference' },
        } as unknown as AttachmentRequestV2)
      ).toBe(false);

      expect(
        isUnifiedAttackAttachment({
          type: SECURITY_ALERT_ATTACHMENT_TYPE,
          owner: 'securitySolution',
          attachmentId: 'alert-1',
        } as AttachmentRequestV2)
      ).toBe(false);
    });
  });
});
