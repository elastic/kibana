/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart, Toast } from '@kbn/core/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';

const NEW_DASHBOARD_TITLE = i18n.translate(
  'xpack.agentBuilderDashboards.otherDashboardUpdate.newDashboardTitle',
  { defaultMessage: 'New Dashboard' }
);

/**
 * Tells the user when the agent changed a dashboard other than the open one, with one toast per
 * attachment, since applying it would overwrite the open dashboard.
 */
export const createOtherDashboardUpdateNotifier = ({
  toasts,
  openAttachment,
}: {
  toasts: CoreStart['notifications']['toasts'];
  openAttachment: (attachment: DashboardAttachment) => void;
}): ((attachment: DashboardAttachment) => void) => {
  const toastsByAttachmentId = new Map<string, Toast>();

  const removeToast = (attachmentId: string) => {
    const toast = toastsByAttachmentId.get(attachmentId);
    if (toast) {
      toasts.remove(toast);
      toastsByAttachmentId.delete(attachmentId);
    }
  };

  return (attachment) => {
    removeToast(attachment.id);
    const toast = toasts.addInfo({
      title: i18n.translate('xpack.agentBuilderDashboards.otherDashboardUpdate.title', {
        defaultMessage: 'The agent updated {title}',
        values: { title: attachment.data.title || NEW_DASHBOARD_TITLE },
      }),
      text: i18n.translate('xpack.agentBuilderDashboards.otherDashboardUpdate.description', {
        defaultMessage: "It isn't the dashboard you're viewing.",
      }),
      actionProps: {
        primary: {
          children: i18n.translate('xpack.agentBuilderDashboards.otherDashboardUpdate.openButton', {
            defaultMessage: 'Open',
          }),
          onClick: () => {
            removeToast(attachment.id);
            openAttachment(attachment);
          },
        },
      },
    });
    toastsByAttachmentId.set(attachment.id, toast);
  };
};
