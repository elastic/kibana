/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Storybook mock — provides a minimal attachmentsService so AttachmentPill can render thumbnails.

import { AttachmentType } from '@kbn/agent-builder-common/attachments';

const attachmentsService = {
  getAttachmentUiDefinition: (type: string) => {
    if (type === AttachmentType.image) {
      return {
        getLabel: (a: { data?: { filename?: string } }) => a.data?.filename ?? 'Image',
        getIcon: () => 'image' as const,
        getPillThumbnail: (a: { data?: { content?: string } }) => a.data?.content,
      };
    }
    return undefined;
  },
};

export const useAgentBuilderServices = () => ({ attachmentsService } as never);
