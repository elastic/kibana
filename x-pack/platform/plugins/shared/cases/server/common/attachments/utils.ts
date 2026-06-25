/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toStringOrStringArray } from '../../../common/utils/attachments';
import type { UnifiedReferenceAttachmentPayload } from '../../../common/types/domain/attachment/v2';

export const toReferenceMetadata = (
  index: string | string[] | undefined
): UnifiedReferenceAttachmentPayload['metadata'] => {
  const normalizedIndex = toStringOrStringArray(index);
  return normalizedIndex == null ? undefined : { index: normalizedIndex };
};

export const normalizeReferenceAttachmentId = (
  attachmentId: string | string[]
): string | string[] => {
  return toStringOrStringArray(attachmentId) ?? attachmentId;
};
