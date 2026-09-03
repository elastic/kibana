/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { z } from '@kbn/zod/v4';
import type { UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
  isLegacyAttachmentRequest,
  isUnifiedAttachmentRequest,
  isPersistableType,
  toUnifiedPersistableStateAttachmentType,
} from '../../../common/utils/attachments';
import { EXTERNAL_REFERENCE_TYPE_MAP } from '../../../common/constants/attachments';
import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
import { externalReferenceAttachmentTransformer } from '../../common/attachments/external_reference';
import { persistableStateAttachmentTransformer } from '../../common/attachments/persistable_state';

/** Throws `Boom.badRequest` with a `path: message` summary of every zod issue. */
export const parseUnifiedAttachmentWithSchema = (
  schema: z.ZodType,
  payload: UnifiedAttachmentPayload,
  type: string
): void => {
  const result = schema.safeParse(payload);
  if (result.success) {
    return;
  }
  const summary = result.error.issues
    .map(({ path, message }) => `${path.length > 0 ? path.join('.') : '(root)'}: ${message}`)
    .join('; ');
  throw Boom.badRequest(`Invalid attachment payload for type '${type}': ${summary}`);
};

/**
 * A legacy attachment is only valid when its type maps to a migrated unified
 * type that is registered; otherwise it is rejected as unregistered.
 */
const assertMigratedUnifiedType = (
  legacyTypeId: string,
  unifiedTypeId: string | undefined,
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry
): void => {
  if (unifiedTypeId === undefined) {
    throw Boom.badRequest(`Attachment type ${legacyTypeId} is not registered.`);
  }
  if (!unifiedAttachmentTypeRegistry.has(unifiedTypeId)) {
    throw Boom.badRequest(
      `Attachment type ${legacyTypeId} (unified: ${unifiedTypeId}) is not registered in unified attachment type registry.`
    );
  }
};

export const validateLegacyRegisteredAttachments = ({
  query,
  unifiedAttachmentTypeRegistry,
}: {
  query: AttachmentRequest;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => {
  // Each legacy branch resolves its unified type id, asserts it is a registered
  // migrated type, then transforms the legacy payload into its unified shape and
  // re-validates via the unified zod schema so legacy clients get the same
  // strictness as unified clients.
  if (isCommentRequestTypeExternalReference(query)) {
    const legacyTypeId = query.externalReferenceAttachmentTypeId;
    assertMigratedUnifiedType(
      legacyTypeId,
      EXTERNAL_REFERENCE_TYPE_MAP[legacyTypeId],
      unifiedAttachmentTypeRegistry
    );
    validateUnifiedRegisteredAttachments({
      query: externalReferenceAttachmentTransformer.toUnifiedPayload(query),
      unifiedAttachmentTypeRegistry,
    });
    return;
  }

  if (isCommentRequestTypePersistableState(query)) {
    const legacyTypeId = query.persistableStateAttachmentTypeId;
    assertMigratedUnifiedType(
      legacyTypeId,
      isPersistableType(legacyTypeId)
        ? toUnifiedPersistableStateAttachmentType(legacyTypeId)
        : undefined,
      unifiedAttachmentTypeRegistry
    );
    validateUnifiedRegisteredAttachments({
      query: persistableStateAttachmentTransformer.toUnifiedPayload(query),
      unifiedAttachmentTypeRegistry,
    });
  }
};

export const validateUnifiedRegisteredAttachments = ({
  query,
  unifiedAttachmentTypeRegistry,
}: {
  query: UnifiedAttachmentPayload;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => {
  if (!unifiedAttachmentTypeRegistry.has(query.type)) {
    throw Boom.badRequest(
      `Attachment type ${query.type} is not registered in unified attachment type registry.`
    );
  }

  const attachmentType = unifiedAttachmentTypeRegistry.get(query.type);
  if (!attachmentType) {
    throw Boom.badRequest(
      `Attachment type ${query.type} is not registered in unified attachment type registry.`
    );
  }

  if (!attachmentType.schema) {
    throw Boom.badRequest(`Attachment type '${query.type}' does not define a schema.`);
  }

  parseUnifiedAttachmentWithSchema(attachmentType.schema, query, query.type);
};

export const validateRegisteredAttachments = ({
  query,
  unifiedAttachmentTypeRegistry,
}: {
  query: AttachmentRequestV2;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => {
  if (isLegacyAttachmentRequest(query)) {
    validateLegacyRegisteredAttachments({
      query,
      unifiedAttachmentTypeRegistry,
    });
  } else if (isUnifiedAttachmentRequest(query)) {
    validateUnifiedRegisteredAttachments({
      query,
      unifiedAttachmentTypeRegistry,
    });
  } else {
    throw Boom.badRequest(`Invalid attachment request type: ${typeof query}`);
  }
};
