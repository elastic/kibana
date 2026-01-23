/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/** Attachment type identifier for dashboard state */
export const DASHBOARD_ATTACHMENT_TYPE = 'dashboard';

export const dashboardAttachmentDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  markdownContent: z.string(),
  visualizationIds: z.array(z.string()),
});

/**
 * Data for a dashboard attachment.
 */
export interface DashboardAttachmentData {
  /** dashboard title */
  title: string;
  /** dashboard description */
  description: string;
  /** markdown content for the summary panel */
  markdownContent: string;
  /** array of visualization attachment IDs */
  visualizationIds: string[];
}

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
          return { type: 'text', value: formatDashboardAttachment(attachment.data) };
        },
      };
    },
    getTools: () => [],
  };
};

const formatDashboardAttachment = (data: DashboardAttachmentData): string => {
  const vizCount = data.visualizationIds.length;
  return `Dashboard: "${data.title}" - ${data.description} (${vizCount} visualization${
    vizCount !== 1 ? 's' : ''
  })`;
};
