/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../types/domain';
import type { AttachmentUIV2 } from '../../ui/types';
import { isUnifiedAlertAttachment } from './v2_type_guards';
import { toStringArray } from './string_utils';

/**
 * Returns the deduped list of alert ids attached to a case across both legacy
 * and unified alert attachments. Used by solution alert tabs to drive the
 * alerts table.
 */
export const getManualAlertIds = (comments: AttachmentUIV2[]): string[] => {
  const dedupeAlerts = comments.reduce((alertIds, comment: AttachmentUIV2) => {
    if (comment.type === AttachmentType.alert && 'alertId' in comment) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      ids.forEach((id) => alertIds.add(id));
    } else if (isUnifiedAlertAttachment(comment)) {
      toStringArray(comment.attachmentId).forEach((id) => alertIds.add(id));
    }
    return alertIds;
  }, new Set<string>());
  return Array.from(dedupeAlerts);
};
