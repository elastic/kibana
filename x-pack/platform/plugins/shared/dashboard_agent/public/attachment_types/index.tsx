/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { DashboardCanvasContent } from './dashboard_canvas_content';

export const registerDashboardAttachmentUiDefinition = ({
  attachments,
  dashboardLocator,
}: {
  attachments: AttachmentServiceStartContract;
  dashboardLocator?: DashboardRendererProps['locator'];
}): (() => void) => {
  attachments.addAttachmentType<DashboardAttachment>(DASHBOARD_ATTACHMENT_TYPE, {
    getLabel: (attachment) => {
      return (
        attachment.data?.title ||
        i18n.translate('xpack.dashboardAgent.attachments.dashboard.label', {
          defaultMessage: 'New Dashboard',
        })
      );
    },
    getIcon: () => 'productDashboard',
    renderCanvasContent: (props, registerActionButtons) => (
      <DashboardCanvasContent
        {...props}
        registerActionButtons={registerActionButtons}
        dashboardLocator={dashboardLocator}
      />
    ),
    getActionButtons: ({ openCanvas }) => {
      if (!openCanvas) {
        return [];
      }

      return [
        {
          label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.previewActionLabel', {
            defaultMessage: 'Preview',
          }),
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: openCanvas,
        },
      ];
    },
  });

  return () => {};
};
