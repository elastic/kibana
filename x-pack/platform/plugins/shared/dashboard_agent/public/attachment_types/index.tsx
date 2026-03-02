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
import { DashboardCanvasContent } from './dashboard_canvas_content';

// TODO: Remove this once we have a real action for the canvas - required to show the canvas header
const canvasNoopAction = {
  label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.canvasNoopActionLabel', {
    defaultMessage: 'Placeholder',
  }),
  icon: 'eye',
  type: ActionButtonType.PRIMARY,
  handler: () => undefined,
} as const;

export const registerDashboardAttachmentUiDefinition = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
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
    renderCanvasContent: (props) => <DashboardCanvasContent {...props} />,
    getActionButtons: ({ isCanvas, openCanvas }) => {
      if (isCanvas) {
        return [canvasNoopAction];
      }

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
