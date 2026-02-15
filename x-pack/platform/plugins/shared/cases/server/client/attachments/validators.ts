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
  isUnifiedAttachmentRequest,
} from '../../../common/utils/attachments';
import type { AttachmentRequest } from '../../../common/types/api';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';

export const validateRegisteredAttachments = ({
  query,
  persistableStateAttachmentTypeRegistry,
  externalReferenceAttachmentTypeRegistry,
  unifiedAttachmentTypeRegistry,
}: {
  query: AttachmentRequest | UnifiedAttachmentPayload;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => {
  if (isUnifiedAttachmentRequest(query) && !unifiedAttachmentTypeRegistry.has(query.type)) {
    throw Boom.badRequest(
      `Attachment type ${query.type} is not registered in unified attachment type registry.`
    );
  }

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
