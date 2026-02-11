/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardAttachmentDataSchema,
  type DashboardAttachmentData,
} from '@kbn/dashboard-agent-common';

/**
 * Creates the definition for the `dashboard` attachment type.
 */
export const createDashboardAttachmentType = (): AttachmentTypeDefinition<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
> => {
  return {
    id: DASHBOARD_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = dashboardAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return {
            type: 'text',
            value: formatDashboardAttachment(attachment.id, attachment.data),
          };
        },
      };
    },
    getTools: () => [],
  };
};

const formatDashboardAttachment = (attachmentId: string, data: DashboardAttachmentData): string => {
  // Count top-level panels plus panels in all sections
  const sectionPanelCount = (data.sections ?? []).reduce(
    (acc, section) => acc + section.panels.length,
    0
  );
  const panelCount = data.panels.length + sectionPanelCount;
  const sectionCount = data.sections?.length ?? 0;
  const sectionInfo =
    sectionCount > 0 ? `, ${sectionCount} section${sectionCount !== 1 ? 's' : ''}` : '';

  // Include attachment id prominently so the LLM can reference it in subsequent calls
  return `Dashboard "${data.title}" (dashboardAttachment.id: "${attachmentId}")
Description: ${data.description}
Panels: ${panelCount}${sectionInfo}`;
};
