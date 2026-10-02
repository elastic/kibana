/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { z } from '@kbn/zod/v4';
import type { UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';

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

export const validateUnifiedAttachments = ({
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
  if (!attachmentType.schema) {
    throw Boom.badRequest(`Attachment type '${query.type}' does not define a schema.`);
  }

  parseUnifiedAttachmentWithSchema(attachmentType.schema, query, query.type);
};
