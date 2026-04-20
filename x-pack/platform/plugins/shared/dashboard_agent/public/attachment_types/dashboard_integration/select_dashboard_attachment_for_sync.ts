/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';

export const selectDashboardAttachmentForSync = ({
  attachments,
  currentSavedObjectId,
}: {
  attachments: readonly DashboardAttachment[];
  currentSavedObjectId: string | undefined;
}): DashboardAttachment | undefined => {
  if (currentSavedObjectId) {
    return (
      attachments.find(({ origin }) => origin === currentSavedObjectId) ??
      (attachments.length === 1 ? attachments[0] : undefined)
    );
  }

  return attachments.find(({ origin }) => origin === undefined) ?? attachments.at(0);
};
