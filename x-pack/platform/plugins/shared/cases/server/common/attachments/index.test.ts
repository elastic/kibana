/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../common/types/domain';
import {
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  LEGACY_ACTIONS_TYPE,
  LEGACY_LENS_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { getAttachmentTypeFromAttributes, getAttachmentTypeTransformers } from '.';
import { actionsAttachmentTransformer } from './actions';
import { commentAttachmentTransformer } from './comment';
import { alertAttachmentTransformer } from './alert';
import { passThroughTransformer } from './base';
import { externalReferenceAttachmentTransformer } from './external_reference';

const owner = 'cases';

describe('common/attachments', () => {
  describe('getAttachmentTypeTransformers', () => {
    it('returns comment transformer correctly', () => {
      const transformer1 = getAttachmentTypeTransformers(COMMENT_ATTACHMENT_TYPE, owner);
      expect(transformer1).toBe(commentAttachmentTransformer);

      const transformer2 = getAttachmentTypeTransformers('comment', owner);
      expect(transformer2).toBe(commentAttachmentTransformer);

      const transformer3 = getAttachmentTypeTransformers(AttachmentType.user, owner);
      expect(transformer3).toBe(commentAttachmentTransformer);

      const transformer4 = getAttachmentTypeTransformers('user', owner);
      expect(transformer4).toBe(commentAttachmentTransformer);
    });

    it('returns external reference transformer for security.endpoint', () => {
      const transformer = getAttachmentTypeTransformers(SECURITY_ENDPOINT_ATTACHMENT_TYPE, owner);
      expect(transformer).toBe(externalReferenceAttachmentTransformer);
    });

    it('returns actions transformer for legacy actions routing key', () => {
      const transformer = getAttachmentTypeTransformers(LEGACY_ACTIONS_TYPE, owner);
      expect(transformer).toBe(actionsAttachmentTransformer);
    });

    it('returns actions transformer when dispatching from attribute type', () => {
      const routingKey = getAttachmentTypeFromAttributes({
        type: AttachmentType.actions,
        comment: 'hi',
        actions: { type: 'isolate', targets: [] },
      });
      expect(routingKey).toBe(LEGACY_ACTIONS_TYPE);
      expect(getAttachmentTypeTransformers(routingKey, owner)).toBe(actionsAttachmentTransformer);
    });

    it('returns event transformer for security.event in both legacy and unified routing keys', () => {
      const legacyEventTransformer = getAttachmentTypeTransformers(
        AttachmentType.event,
        SECURITY_SOLUTION_OWNER
      );
      expect(
        legacyEventTransformer.isType({
          type: AttachmentType.event,
          eventId: 'event-1',
          index: 'index-1',
          owner: SECURITY_SOLUTION_OWNER,
        } as never)
      ).toBe(true);

      const unifiedEventTransformer = getAttachmentTypeTransformers(
        'security.event',
        SECURITY_SOLUTION_OWNER
      );
      expect(
        unifiedEventTransformer.isType({
          type: 'security.event',
          attachmentId: 'event-1',
          metadata: { index: 'index-1' },
          owner: SECURITY_SOLUTION_OWNER,
        } as never)
      ).toBe(true);
    });

    it('returns alert transformer for AttachmentType.alert', () => {
      const transformer = getAttachmentTypeTransformers(AttachmentType.alert, owner);
      expect(transformer).toBe(alertAttachmentTransformer);
    });

    it('returns pass-through transformer for unrecognized types', () => {
      const transformer = getAttachmentTypeTransformers('unknown.type', owner);
      expect(transformer).toBe(passThroughTransformer);
    });

    it('returns configured persistable state transformer for known visualization types', () => {
      const lensTransformer = getAttachmentTypeTransformers(LENS_ATTACHMENT_TYPE, owner);
      expect(lensTransformer).not.toBe(commentAttachmentTransformer);
      expect(
        lensTransformer.isLegacyType({
          type: AttachmentType.persistableState,
          persistableStateAttachmentTypeId: LEGACY_LENS_ATTACHMENT_TYPE,
          persistableStateAttachmentState: {},
          owner: 'securitySolution',
        })
      ).toBe(true);
    });
  });
});
