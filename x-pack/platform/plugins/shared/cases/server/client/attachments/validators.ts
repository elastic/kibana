/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { z } from '@kbn/zod/v4';
import { UnifiedAttachmentBoundsSchema } from '../../../common/types/api/attachment/v2';
import type { UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import { isTypeAllowedForOwner } from '../../../common/utils/attachments';
import { isTopLevelAppEnabled } from '../../common/top_level_app';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';

const summarizeIssues = (error: z.ZodError): string =>
  error.issues
    .map(({ path, message }) => `${path.length > 0 ? path.join('.') : '(root)'}: ${message}`)
    .join('; ');

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
  throw Boom.badRequest(
    `Invalid attachment payload for type '${type}': ${summarizeIssues(result.error)}`
  );
};

export const validateUnifiedAttachments = ({
  query,
  unifiedAttachmentTypeRegistry,
}: {
  query: UnifiedAttachmentPayload;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
}) => {
  // Runs first so later errors, which echo `type` and `owner`, only see bounded values.
  const bounds = UnifiedAttachmentBoundsSchema.safeParse(query);
  if (!bounds.success) {
    throw Boom.badRequest(`Invalid attachment payload: ${summarizeIssues(bounds.error)}`);
  }

  if (!unifiedAttachmentTypeRegistry.has(query.type)) {
    throw Boom.badRequest(
      `Attachment type ${query.type} is not registered in unified attachment type registry.`
    );
  }

  // A solution-scoped type renders with that solution's providers. In the per-solution apps a
  // case only had its own solution's providers, so other types crashed its view; the top-level
  // app wraps each attachment in its type's providers, so any solution can attach to any case.
  if (!isTopLevelAppEnabled() && !isTypeAllowedForOwner(query.type, query.owner)) {
    throw Boom.badRequest(
      `Attachment type ${query.type} cannot be attached to a case with owner ${query.owner}.`
    );
  }

  const attachmentType = unifiedAttachmentTypeRegistry.get(query.type);
  if (!attachmentType.schema) {
    throw Boom.badRequest(`Attachment type '${query.type}' does not define a schema.`);
  }

  parseUnifiedAttachmentWithSchema(attachmentType.schema, query, query.type);
};
