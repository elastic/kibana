/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../../common/types/domain';
import type { AttachmentUI } from '../../../containers/types';

export const getManualAlertIds = (comments: AttachmentUI[]): string[] => {
  const dedupeAlerts = comments.reduce((alertIds, comment: AttachmentUI) => {
    if (comment.type === AttachmentType.alert) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      ids.forEach((id) => alertIds.add(id));
      return alertIds;
    }
    return alertIds;
  }, new Set<string>());
  return Array.from(dedupeAlerts);
};
