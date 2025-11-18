/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, dashboardAttachmentDataSchema } from '@kbn/onechat-common/attachments';
import type { DashboardAttachmentData } from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { platformCoreTools } from '@kbn/onechat-common/tools';

/**
 * Creates the definition for the `dashboard` attachment type.
 */
export const createDashboardAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.dashboard,
  DashboardAttachmentData
> => {
  return {
    id: AttachmentType.dashboard,
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
          return { type: 'text', value: formatDashboardAttachment(attachment.data) };
        },
      };
    },
    // Only update_dashboard tool exposed via attachment
    getTools: () => [platformCoreTools.updateDashboard],
    getAgentDescription: () =>
      'A dashboard context is available. You can use the update_dashboard tool to modify it.',
  };
};

const formatDashboardAttachment = (data: DashboardAttachmentData): string => {
  let formatted = `Dashboard Context:\n`;
  formatted += `- ID: ${data.dashboardId}\n`;
  formatted += `- Title: ${data.title}\n`;
  if (data.description) {
    formatted += `- Description: ${data.description}\n`;
  }
  return formatted;
};
