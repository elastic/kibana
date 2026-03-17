/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  type CheckStaleAttachmentsResponse,
  type StaleAttachment,
} from '../../../../common/http_api/attachments';

/**
 * Builds attachment inputs from the stale check API response.
 */
export const getStaleAttachmentInputs = (
  staleResponse: CheckStaleAttachmentsResponse,
  excludeAttachmentIds: Set<string>
): Attachment[] =>
  (staleResponse.attachments ?? [])
    .filter(
      (attachment): attachment is StaleAttachment =>
        attachment.is_stale && !excludeAttachmentIds.has(attachment.id)
    )
    .map(({ is_stale, origin, ...rest }) => rest);
