/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isPlainObject } from 'lodash';
import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type {
  AttachmentAttributesV2,
  UnifiedAttachmentPayload,
} from '../../../common/types/domain/attachment/v2';
import type { ActionsAttachmentPayload } from '../../../common/types/domain';
import { ActionsAttachmentPayloadSchema } from '../../../common/types/domain/attachment/v1';
import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
import { extractCommonAttributes } from './base';
import { externalReferenceAttachmentTransformer } from './external_reference';

/**
 * The legacy `actions` attachment predates multi-EDR support and only ever recorded
 * Elastic Defend host isolation events. When converting to the unified
 * `security.endpoint` shape we default `agentType` accordingly.
 *
 * Kept in sync (by hand) with the first literal of `RESPONSE_ACTION_AGENT_TYPE` in
 * `x-pack/solutions/security/plugins/security_solution/common/endpoint/service/response_actions/constants.ts`,
 * which the server-side `EndpointAttachmentMetadataRt` validator uses.
 */
const DEFAULT_LEGACY_AGENT_TYPE = 'endpoint' as const;

/**
 * The legacy `actions` shape has no foreign-reference id (the payload was fully
 * self-contained). The unified reference attachment shape requires `attachmentId`
 * to be a non-empty string, so we emit an explicit sentinel that makes the
 * synthetic origin discoverable in logs and the UI.
 *
 * Note on aggregations: every migrated legacy `actions` row shares this `attachmentId`,
 * so any `terms` aggregation on `cases-attachments.attributes.attachmentId` (e.g.
 * `getAllAlertIds` in services/attachments/operations/get.ts) will bucket them together.
 * Today those aggregations always include a type filter that excludes
 * `security.endpoint`, so the sentinel is inert; revisit this if a future query
 * aggregates across all unified types without a type filter.
 */
export const LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID = 'legacy-actions';

/**
 * Persisted-attribute shape of a legacy `actions` row (top-level `actions` type
 * is being retired). We re-use the canonical io-ts–derived payload type instead
 * of redeclaring it inline so the transformer and the route validator stay in
 * sync if the legacy shape ever evolves before retirement.
 */
type LegacyActionsAttributes = ActionsAttachmentPayload;

/**
 * Delegates the structural check to the same io-ts codec that decodes inbound
 * `actions` requests so the transformer and route validator can't drift. Extra
 * audit fields on persisted SO rows are ignored by the strict codec, so we
 * narrow the input to the payload slice before calling `.is`.
 */
function isLegacyActionsShape(attributes: unknown): attributes is LegacyActionsAttributes {
  if (!isPlainObject(attributes) || attributes === null) return false;
  const { type, comment, actions, owner } = attributes as Record<string, unknown>;
  return ActionsAttachmentPayloadSchema.safeParse({ type, comment, actions, owner }).success;
}

function hasConvertibleTargets(attributes: LegacyActionsAttributes): boolean {
  return attributes.actions.targets.length > 0;
}

function buildUnifiedMetadata(legacyActions: LegacyActionsAttributes['actions']): {
  command: string;
  targets: Array<{ endpointId: string; hostname: string; agentType: string }>;
} {
  return {
    command: legacyActions.type,
    targets: legacyActions.targets.map((target) => ({
      endpointId: target.endpointId,
      hostname: target.hostname,
      agentType: DEFAULT_LEGACY_AGENT_TYPE,
    })),
  };
}

/**
 * Transformer for the legacy `actions` attachment (host isolation / release).
 *
 * This is the only *asymmetric* transformer in the attachments pipeline: the
 * legacy `actions` top-level type is being retired and must never be re-emitted.
 * Forward migration (legacy → unified) is performed here; the reverse path
 * (unified → legacy) is delegated to `externalReferenceAttachmentTransformer`,
 * which projects unified `security.endpoint` payloads back to `externalReference +
 * externalReferenceAttachmentTypeId: 'endpoint'`. Inputs that are already in a
 * legacy shape (or any other shape) pass through unchanged in that delegate.
 *
 * Data-shape mapping (legacy → unified):
 *   { type: 'actions',
 *     owner,
 *     comment,
 *     actions: {
 *       type,
 *       targets: [{ hostname, endpointId }]
 *     }
 *   }
 * becomes
 *   { type: 'security.endpoint',
 *     attachmentId: 'legacy-actions',
 *     owner,
 *     data: { content: comment },
 *     metadata: {
 *       command: actions.type,
 *       targets: [{ endpointId, hostname, agentType: 'endpoint' }],
 *     } }
 */
export const actionsAttachmentTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    if (!isLegacyActionsShape(attributes)) {
      return attributes as UnifiedAttachmentAttributes;
    }

    if (!hasConvertibleTargets(attributes)) {
      throw Boom.badRequest(
        'legacy actions row has no targets to migrate (cannot satisfy security.endpoint metadata schema)'
      );
    }

    // `extractCommonAttributes` is typed against `AttachmentAttributesV2` but
    // only reads the audit fields (`created_by`, `pushed_by`, `updated_by`,
    // timestamps) which are present on every persisted SO row regardless of
    // its top-level type, so the structural cast is safe for legacy `actions`
    // rows.
    return {
      type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
      attachmentId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
      owner: attributes.owner,
      data: { content: attributes.comment },
      metadata: buildUnifiedMetadata(attributes.actions),
      ...extractCommonAttributes(attributes as AttachmentAttributesV2),
    } as UnifiedAttachmentAttributes;
  },

  /**
   * Legacy `actions` persisted rows are left untouched (they are already in a
   * legacy shape); migrated `security.endpoint` rows are projected back to the
   * legacy `externalReference` shape by the external-reference transformer so
   * we never re-emit the deprecated `actions` top-level type.
   */
  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
    return externalReferenceAttachmentTransformer.toLegacySchema(attributes);
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return isLegacyActionsShape(attributes);
  },

  isUnifiedType(_attributes: unknown): boolean {
    // The actions transformer has no unified type of its own; once migrated, attachments
    // carry the `security.endpoint` unified type which is owned by the external-reference
    // transformer.
    return false;
  },

  isLegacyType(attributes: unknown): boolean {
    return isLegacyActionsShape(attributes);
  },

  isLegacyPayload(attachment: AttachmentRequestV2): boolean {
    return isLegacyActionsShape(attachment);
  },

  isUnifiedPayload(_attachment: AttachmentRequestV2): boolean {
    return false;
  },

  toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedAttachmentPayload {
    if (!isLegacyActionsShape(attachment)) {
      throw Boom.badRequest('Expected legacy actions attachment payload');
    }
    if (!hasConvertibleTargets(attachment)) {
      throw Boom.badRequest('Legacy actions payload has no targets to migrate');
    }
    return {
      type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
      attachmentId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
      owner: attachment.owner,
      data: { content: attachment.comment },
      metadata: buildUnifiedMetadata(attachment.actions),
    };
  },

  /**
   * Delegates to the external-reference transformer so a unified
   * `security.endpoint` payload is projected back to the legacy `externalReference`
   * shape. Passing a legacy `actions` payload here throws (by design) — this
   * transformer never re-emits the deprecated `actions` payload shape.
   */
  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest {
    if (isLegacyActionsShape(attachment)) {
      throw Boom.badRequest(
        'actionsAttachmentTransformer never re-emits the deprecated `actions` payload shape'
      );
    }
    return externalReferenceAttachmentTransformer.toLegacyPayload(attachment);
  },
};
