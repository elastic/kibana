/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../common/types/domain';
import {
  COMMENT_ATTACHMENT_TYPE,
  DASHBOARD_ATTACHMENT_TYPE,
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  MAP_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  LENS_SO_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  SECURITY_ENTITY_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
  SECURITY_TIMELINE_ATTACHMENT_TYPE,
  LEGACY_ACTIONS_TYPE,
  LEGACY_LENS_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { MAX_COMMENT_LENGTH, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import type {
  AttachmentAttributesV2,
  AttachmentV2,
} from '../../../common/types/domain/attachment/v2';
import { actionComment, alertComment, comment } from '../../mocks';
import {
  getAttachmentTypeFromAttributes,
  getAttachmentTypeTransformers,
  toLegacyAttachmentAttributes,
  toLegacyAttachmentResponse,
  toLegacyCaseResponse,
  toUnifiedAttachmentPayload,
  toUnifiedAttachmentPatchPayload,
  toUnifiedAttachmentRequest,
  toUnifiedAttachmentPatchRequest,
} from '.';
import { actionsAttachmentTransformer } from './actions';
import { commentAttachmentTransformer } from './comment';
import { alertAttachmentTransformer } from './alert';
import { passThroughTransformer } from './base';
import { externalReferenceAttachmentTransformer } from './external_reference';

const owner = 'cases';

const basicAttributes = {
  created_at: '2026-05-29T00:00:00.000Z',
  created_by: { username: 'tester', full_name: null, email: null },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

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

describe('toLegacyAttachmentAttributes', () => {
  it('maps a unified comment to the v1 user comment shape', () => {
    const out = toLegacyAttachmentAttributes({
      type: COMMENT_ATTACHMENT_TYPE,
      data: { content: 'hello' },
      owner: 'cases',
      ...basicAttributes,
    });

    expect(out).toMatchObject({
      type: AttachmentType.user,
      comment: 'hello',
      owner: 'cases',
    });
  });

  it('maps a unified security.alert to the v1 alert shape', () => {
    const out = toLegacyAttachmentAttributes({
      type: SECURITY_ALERT_ATTACHMENT_TYPE,
      attachmentId: 'alert-1',
      owner: 'securitySolution',
      metadata: {
        index: '.alerts-security.alerts',
        rule: { id: 'rule-1', name: 'Rule' },
      },
      ...basicAttributes,
    });

    expect(out).toMatchObject({
      type: AttachmentType.alert,
      alertId: 'alert-1',
      index: '.alerts-security.alerts',
      rule: { id: 'rule-1', name: 'Rule' },
    });
  });

  it('maps a unified security.event to the v1 event shape', () => {
    const out = toLegacyAttachmentAttributes({
      type: SECURITY_EVENT_ATTACHMENT_TYPE,
      attachmentId: 'event-1',
      owner: 'securitySolution',
      metadata: { index: 'logs-*' },
      ...basicAttributes,
    });

    expect(out).toMatchObject({
      type: AttachmentType.event,
      eventId: 'event-1',
      index: 'logs-*',
    });
  });

  it('maps a unified file to a v1 externalReference', () => {
    const out = toLegacyAttachmentAttributes({
      type: FILE_ATTACHMENT_TYPE,
      attachmentId: 'file-1',
      owner: 'cases',
      metadata: {
        soType: 'file',
        files: [
          { name: 'test.txt', extension: 'txt', mimeType: 'text/plain', created: '2026-05-29' },
        ],
      },
      ...basicAttributes,
    });

    expect(out).toMatchObject({
      type: AttachmentType.externalReference,
    });
  });

  it('maps a by-value lens to a v1 persistableState', () => {
    const out = toLegacyAttachmentAttributes({
      type: LENS_ATTACHMENT_TYPE,
      owner: 'cases',
      data: { state: { visualization: {} } },
      ...basicAttributes,
    });

    expect(out).toMatchObject({
      type: AttachmentType.persistableState,
    });
  });

  it('passes through security.timeline', () => {
    const attrs = {
      type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
      attachmentId: 'timeline-1',
      owner: 'securitySolution',
      metadata: { title: 'My timeline' },
      ...basicAttributes,
    };

    expect(toLegacyAttachmentAttributes(attrs)).toMatchObject({
      type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
      attachmentId: 'timeline-1',
    });
  });

  it('passes through security.entity', () => {
    const attrs = {
      type: SECURITY_ENTITY_ATTACHMENT_TYPE,
      attachmentId: 'entity-1',
      owner: 'securitySolution',
      ...basicAttributes,
    };

    expect(toLegacyAttachmentAttributes(attrs).type).toBe(SECURITY_ENTITY_ATTACHMENT_TYPE);
  });

  it('passes through dashboard', () => {
    const attrs = {
      type: DASHBOARD_ATTACHMENT_TYPE,
      owner: 'cases',
      attachmentId: 'dash-1',
      metadata: { title: 'My dashboard', soType: 'dashboard' },
      ...basicAttributes,
    };

    expect(toLegacyAttachmentAttributes(attrs).type).toBe(DASHBOARD_ATTACHMENT_TYPE);
  });

  it('passes through map', () => {
    const attrs = {
      type: MAP_ATTACHMENT_TYPE,
      owner: 'cases',
      attachmentId: 'map-1',
      metadata: { title: 'My map', soType: 'map' },
      ...basicAttributes,
    };

    expect(toLegacyAttachmentAttributes(attrs).type).toBe(MAP_ATTACHMENT_TYPE);
  });

  it('passes through discoverSession', () => {
    const attrs = {
      type: DISCOVER_SESSION_ATTACHMENT_TYPE,
      owner: 'cases',
      attachmentId: 'search-1',
      metadata: { title: 'Saved search', soType: 'search' },
      ...basicAttributes,
    };

    expect(toLegacyAttachmentAttributes(attrs).type).toBe(DISCOVER_SESSION_ATTACHMENT_TYPE);
  });

  it('passes through lens-by-reference', () => {
    const attrs = {
      type: LENS_ATTACHMENT_TYPE,
      owner: 'cases',
      attachmentId: 'lens-1',
      metadata: { title: 'My lens', soType: LENS_SO_TYPE },
      ...basicAttributes,
    };

    expect(toLegacyAttachmentAttributes(attrs)).toMatchObject({
      type: LENS_ATTACHMENT_TYPE,
      attachmentId: 'lens-1',
      metadata: { soType: LENS_SO_TYPE },
    });
  });
});

describe('toLegacyAttachmentResponse', () => {
  it('keeps id and version while converting attributes', () => {
    const attachment = {
      id: 'so-1',
      version: 'WzEsMV0=',
      type: COMMENT_ATTACHMENT_TYPE,
      data: { content: 'hello' },
      owner: 'cases',
      ...basicAttributes,
    } as AttachmentV2;

    expect(toLegacyAttachmentResponse(attachment)).toMatchObject({
      id: 'so-1',
      version: 'WzEsMV0=',
      type: AttachmentType.user,
      comment: 'hello',
    });
  });
});

describe('toLegacyCaseResponse', () => {
  it('converts hybrid comments and leaves unified-only comments alone', () => {
    const theCase = {
      id: 'case-1',
      comments: [
        {
          id: 'c1',
          version: '1',
          type: COMMENT_ATTACHMENT_TYPE,
          data: { content: 'hello' },
          owner: 'cases',
          ...basicAttributes,
        },
        {
          id: 'c2',
          version: '1',
          type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
          attachmentId: 'timeline-1',
          owner: 'securitySolution',
          ...basicAttributes,
        },
      ],
    } as unknown as Parameters<typeof toLegacyCaseResponse>[0];

    const out = toLegacyCaseResponse(theCase);
    expect(out.comments?.[0]).toMatchObject({ type: AttachmentType.user, comment: 'hello' });
    expect(out.comments?.[1]).toMatchObject({
      type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
      attachmentId: 'timeline-1',
    });
  });
});

describe('legacy <-> unified round trip', () => {
  // 9.5 safety net: `attachments.enabled` defaults to `false`, so anything persisted
  // as v1 must come back through the public API byte-identical to before this branch.
  it('round-trips a persisted v1 user comment through unified storage and back', () => {
    const persistedV1 = {
      type: AttachmentType.user,
      comment: 'hello',
      owner: 'cases',
      ...basicAttributes,
    };

    const transformer = getAttachmentTypeTransformers(AttachmentType.user, 'cases');
    const unifiedAttributes = transformer.toUnifiedSchema(persistedV1);
    const roundTripped = toLegacyAttachmentAttributes(unifiedAttributes as AttachmentAttributesV2);

    expect(roundTripped).toEqual(persistedV1);
  });

  it('round-trips a persisted v1 alert comment through unified storage and back', () => {
    const persistedV1 = {
      type: AttachmentType.alert,
      alertId: 'alert-1',
      index: '.alerts-security.alerts',
      rule: { id: 'rule-1', name: 'Rule' },
      owner: 'securitySolution',
      ...basicAttributes,
    };

    const transformer = getAttachmentTypeTransformers(AttachmentType.alert, 'securitySolution');
    const unifiedAttributes = transformer.toUnifiedSchema(persistedV1);
    const roundTripped = toLegacyAttachmentAttributes(unifiedAttributes as AttachmentAttributesV2);

    expect(roundTripped).toEqual(persistedV1);
  });

  it('round-trips a v1 comment through the request/response converters unchanged', () => {
    const v1Request = {
      type: AttachmentType.user as const,
      comment: 'hello',
      owner: 'cases',
    };

    const unifiedPayload = toUnifiedAttachmentPayload(v1Request);
    const legacyResponse = toLegacyAttachmentResponse({
      id: 'so-1',
      version: 'WzEsMV0=',
      ...unifiedPayload,
      ...basicAttributes,
    } as AttachmentV2);

    expect(legacyResponse).toEqual({
      id: 'so-1',
      version: 'WzEsMV0=',
      ...v1Request,
      ...basicAttributes,
    });
  });
});

describe('toUnifiedAttachmentPayload', () => {
  it('maps a v1 user comment to the unified payload', () => {
    expect(
      toUnifiedAttachmentPayload({
        type: AttachmentType.user,
        comment: 'hello',
        owner: 'cases',
      })
    ).toEqual({
      type: COMMENT_ATTACHMENT_TYPE,
      data: { content: 'hello' },
      owner: 'cases',
    });
  });

  it('maps a v1 alert to the unified payload', () => {
    expect(
      toUnifiedAttachmentPayload({
        type: AttachmentType.alert,
        alertId: 'alert-1',
        index: '.alerts-security.alerts',
        rule: { id: 'rule-1', name: 'Rule' },
        owner: 'securitySolution',
      })
    ).toMatchObject({
      type: SECURITY_ALERT_ATTACHMENT_TYPE,
      attachmentId: 'alert-1',
      metadata: {
        index: '.alerts-security.alerts',
        rule: { id: 'rule-1', name: 'Rule' },
      },
    });
  });

  it('passes through an already-unified comment', () => {
    const payload = {
      type: COMMENT_ATTACHMENT_TYPE,
      data: { content: 'hello' },
      owner: 'cases',
    };

    expect(toUnifiedAttachmentPayload(payload)).toEqual(payload);
  });

  it('passes through a unified-only entity payload', () => {
    const payload = {
      type: SECURITY_ENTITY_ATTACHMENT_TYPE,
      attachmentId: 'entity-1',
      owner: 'securitySolution',
    };

    expect(toUnifiedAttachmentPayload(payload)).toEqual(payload);
  });
});

describe('toUnifiedAttachmentPatchPayload', () => {
  it('keeps id and version while converting the payload', () => {
    expect(
      toUnifiedAttachmentPatchPayload({
        id: 'so-1',
        version: 'WzEsMV0=',
        type: AttachmentType.user,
        comment: 'hello',
        owner: 'cases',
      })
    ).toEqual({
      id: 'so-1',
      version: 'WzEsMV0=',
      type: COMMENT_ATTACHMENT_TYPE,
      data: { content: 'hello' },
      owner: 'cases',
    });
  });
});

describe('toUnifiedAttachmentRequest', () => {
  it('decodes a v1 comment and returns the unified payload', () => {
    expect(toUnifiedAttachmentRequest(comment)).toEqual({
      type: COMMENT_ATTACHMENT_TYPE,
      data: { content: comment.comment },
      owner: SECURITY_SOLUTION_OWNER,
    });
  });

  it('throws with excess fields', () => {
    expect(() => toUnifiedAttachmentRequest({ ...comment, foo: 'bar' })).toThrow(
      'invalid keys "foo"'
    );
  });

  it('throws when the comment is too long', () => {
    const longComment = 'x'.repeat(MAX_COMMENT_LENGTH + 1);

    expect(() => toUnifiedAttachmentRequest({ ...comment, comment: longComment })).toThrow(
      `The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
    );
  });

  it('throws when the comment is an empty string', () => {
    expect(() => toUnifiedAttachmentRequest({ ...comment, comment: '' })).toThrow(
      'The comment field cannot be an empty string.'
    );
  });

  it('throws when the comment is only whitespace', () => {
    expect(() => toUnifiedAttachmentRequest({ ...comment, comment: '  ' })).toThrow(
      'The comment field cannot be an empty string.'
    );
  });

  it('throws when a v1 alert has mismatched alertId and index lengths', () => {
    expect(() =>
      toUnifiedAttachmentRequest({ ...alertComment, alertId: '1', index: ['index1', 'index2'] })
    ).toThrow('ids and indices arrays of different lengths');
  });

  it('throws when alertId is an array and index is a string of mismatched length', () => {
    expect(() =>
      toUnifiedAttachmentRequest({
        ...alertComment,
        alertId: ['1', '2'],
        index: 'index',
      })
    ).toThrow('ids and indices arrays of different lengths');
  });
});

describe('toUnifiedAttachmentPatchRequest', () => {
  const patchComment = { ...comment, id: 'comment-id', version: 'WzAsMV0=' };
  const patchAction = { ...actionComment, id: 'comment-id', version: 'WzAsMV0=' };

  it('keeps id and version while converting the payload', () => {
    expect(toUnifiedAttachmentPatchRequest(patchComment)).toEqual({
      id: 'comment-id',
      version: 'WzAsMV0=',
      type: COMMENT_ATTACHMENT_TYPE,
      data: { content: comment.comment },
      owner: SECURITY_SOLUTION_OWNER,
    });
  });

  it('throws when the comment is too long', () => {
    const longComment = Array(MAX_COMMENT_LENGTH + 1)
      .fill('x')
      .toString();

    expect(() =>
      toUnifiedAttachmentPatchRequest({ ...patchComment, comment: longComment })
    ).toThrow(
      `The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
    );
  });

  it('throws when the comment is an empty string', () => {
    expect(() => toUnifiedAttachmentPatchRequest({ ...patchComment, comment: '' })).toThrow(
      'The comment field cannot be an empty string.'
    );
  });

  it('throws when the comment is only whitespace', () => {
    expect(() => toUnifiedAttachmentPatchRequest({ ...patchComment, comment: '  ' })).toThrow(
      'The comment field cannot be an empty string.'
    );
  });

  it('throws when an action comment is too long', () => {
    const longComment = Array(MAX_COMMENT_LENGTH + 1)
      .fill('x')
      .toString();

    expect(() => toUnifiedAttachmentPatchRequest({ ...patchAction, comment: longComment })).toThrow(
      `The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
    );
  });

  it('throws when an action comment is an empty string', () => {
    expect(() => toUnifiedAttachmentPatchRequest({ ...patchAction, comment: '' })).toThrow(
      'The comment field cannot be an empty string.'
    );
  });

  it('throws when an action comment is only whitespace', () => {
    expect(() => toUnifiedAttachmentPatchRequest({ ...patchAction, comment: '  ' })).toThrow(
      'The comment field cannot be an empty string.'
    );
  });

  it('throws when a v1 alert patch has mismatched alertId and index lengths', () => {
    expect(() =>
      toUnifiedAttachmentPatchRequest({
        ...alertComment,
        id: 'comment-id',
        version: 'WzAsMV0=',
        alertId: '1',
        index: ['index1', 'index2'],
      })
    ).toThrow('ids and indices arrays of different lengths');
  });
});
