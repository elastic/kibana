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
  isUnifiedReferenceAttachmentRequest,
  isUnifiedValueAttachmentRequest,
  isPersistableType,
  toUnifiedPersistableStateAttachmentType,
} from '../../../common/utils/attachments';
import { EXTERNAL_REFERENCE_TYPE_MAP } from '../../../common/constants/attachments';
import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
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

export const validateLegacyRegisteredAttachments = ({
  query,
  persistableStateAttachmentTypeRegistry,
  externalReferenceAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
}: {
  query: AttachmentRequest;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => {
  if (isCommentRequestTypeExternalReference(query)) {
    const typeId = query.externalReferenceAttachmentTypeId;
    const unifiedTypeId = EXTERNAL_REFERENCE_TYPE_MAP[typeId];
    if (unifiedTypeId !== undefined) {
      if (!unifiedAttachmentTypeRegistry.has(unifiedTypeId)) {
        throw Boom.badRequest(
          `Attachment type ${typeId} (unified: ${unifiedTypeId}) is not registered in unified attachment type registry.`
        );
      }
      // Migrated subtype: transform the legacy payload into its unified shape and
      // re-validate via the unified zod schema so legacy clients get the same
      // strictness as unified clients.
      const unifiedQuery = externalReferenceAttachmentTransformer.toUnifiedPayload(query);
      validateUnifiedRegisteredAttachments({
        query: unifiedQuery,
        unifiedAttachmentTypeRegistry,
      });
      return;
    }
    if (!externalReferenceAttachmentTypeRegistry.has(typeId)) {
      throw Boom.badRequest(`Attachment type ${typeId} is not registered.`);
    }
  }

  if (isCommentRequestTypePersistableState(query)) {
    const typeId = query.persistableStateAttachmentTypeId;

    if (isPersistableType(typeId)) {
      const unifiedTypeId = toUnifiedPersistableStateAttachmentType(typeId);
      if (!unifiedAttachmentTypeRegistry.has(unifiedTypeId)) {
        throw Boom.badRequest(
          `Attachment type ${typeId} (unified: ${unifiedTypeId}) is not registered in unified attachment type registry.`
        );
      }
      // Migrated subtype: transform legacy persistableState payload into its
      // unified value shape and re-validate via the unified zod schema.
      const unifiedQuery = persistableStateAttachmentTransformer.toUnifiedPayload(query);
      validateUnifiedRegisteredAttachments({
        query: unifiedQuery,
        unifiedAttachmentTypeRegistry,
      });
      return;
    }
    if (!persistableStateAttachmentTypeRegistry.has(typeId)) {
      throw Boom.badRequest(`Attachment type ${typeId} is not registered.`);
    }
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

  // Prefer `schema`; fall back to the slice-based `schemaValidator` below.
  if (attachmentType.schema) {
    parseUnifiedAttachmentWithSchema(attachmentType.schema, query, query.type);
    return;
  }

  if (!attachmentType.schemaValidator) {
    throw Boom.badRequest(`Attachment type '${query.type}' does not define a schema validator.`);
  }
  if (isUnifiedValueAttachmentRequest(query)) {
    attachmentType.schemaValidator(query.data);
  } else if (isUnifiedReferenceAttachmentRequest(query)) {
    attachmentType.schemaValidator(query.metadata ?? null);
  } else {
    throw Boom.badRequest(
      `Invalid unified attachment request: expected value (data) or reference (attachmentId) shape.`
    );
  }
};

export const validateRegisteredAttachments = ({
  query,
  persistableStateAttachmentTypeRegistry,
  externalReferenceAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
}: {
  query: AttachmentRequestV2;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => {
  if (isLegacyAttachmentRequest(query)) {
    validateLegacyRegisteredAttachments({
      query,
      persistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry,
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
