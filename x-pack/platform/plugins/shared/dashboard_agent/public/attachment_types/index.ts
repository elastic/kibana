/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { dashboardAttachments } from '../../common';

/**
 * Attachment type with optional attachmentLabel in data
 */
type DashboardAttachmentWithLabel = Attachment<
  string,
  { attachmentLabel?: string } & Record<string, unknown>
>;

const DEFAULT_LABEL = i18n.translate('xpack.dashboardAgent.attachments.dashboard.label', {
  defaultMessage: 'Dashboard',
});

/**
 * Registers the UI definition for dashboard attachments.
 * This allows the agent builder to display a proper label and icon for dashboard attachments.
 */
export function registerDashboardAttachmentUiDefinition(
  attachments: AttachmentServiceStartContract
): void {
  attachments.addAttachmentType<DashboardAttachmentWithLabel>(dashboardAttachments.dashboard, {
    getLabel: (attachment) => {
      return attachment?.data?.attachmentLabel ?? DEFAULT_LABEL;
    },
    getIcon: () => 'dashboardApp',
  });
}
