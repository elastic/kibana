/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
  isLegacyAttachmentRequest,
  isUnifiedAttachmentRequest,
  isUnifiedReferenceAttachmentRequest,
  isUnifiedValueAttachmentRequest,
} from '../../../common/utils/attachments';
import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';

export const validateLegacyRegisteredAttachments = ({
  query,
  persistableStateAttachmentTypeRegistry,
  externalReferenceAttachmentTypeRegistry,
}: {
  query: AttachmentRequest;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
}) => {
  if (
    isCommentRequestTypeExternalReference(query) &&
    !externalReferenceAttachmentTypeRegistry.has(query.externalReferenceAttachmentTypeId)
  ) {
    throw Boom.badRequest(
      `Attachment type ${query.externalReferenceAttachmentTypeId} is not registered.`
    );
  }

  if (
    isCommentRequestTypePersistableState(query) &&
    !persistableStateAttachmentTypeRegistry.has(query.persistableStateAttachmentTypeId)
  ) {
    throw Boom.badRequest(
      `Attachment type ${query.persistableStateAttachmentTypeId} is not registered.`
    );
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
