/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEGACY_ALERT_TYPE } from '../../constants/attachments';
import { toUnifiedAttachmentType } from './migration_utils';

/**
 * Builds a unified alert case attachment payload (without the `owner` field,
 * which is injected by the cases framework at write time).
 *
 * Uses `owner` only to resolve the unified type string (e.g. `security.alert`,
 * `observability.alert`, `stack.alert`). The returned object must be passed
 * through `CaseAttachmentsWithoutOwner`.
 */
export const buildAlertCaseAttachment = (
  owner: string,
  {
    alertId,
    index,
    rule = null,
  }: {
    alertId: string | string[];
    index: string | string[];
    rule?: { id: string | null; name: string | null } | null;
  }
) => ({
  type: toUnifiedAttachmentType(LEGACY_ALERT_TYPE, owner),
  attachmentId: alertId,
  metadata: { index, rule },
});
