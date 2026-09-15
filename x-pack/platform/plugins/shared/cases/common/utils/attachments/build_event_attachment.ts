/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEGACY_EVENT_TYPE } from '../../constants/attachments';
import { toUnifiedAttachmentType } from './migration_utils';

/**
 * Builds a unified event case attachment payload (without the `owner` field,
 * which is injected by the cases framework at write time).
 *
 * Uses `owner` only to resolve the unified type string (e.g. `security.event`,
 * `observability.event`, `stack.event`). The returned object must be passed
 * through `CaseAttachmentsWithoutOwner`.
 */
export const buildEventCaseAttachment = (
  owner: string,
  {
    eventId,
    index,
  }: {
    eventId: string | string[];
    index: string | string[];
  }
) => ({
  type: toUnifiedAttachmentType(LEGACY_EVENT_TYPE, owner),
  attachmentId: eventId,
  metadata: { index },
});
