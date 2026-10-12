/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AppDocument } from '@kbn/custom-app-common';
import {
  CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  type CustomAppContextAttachmentData,
} from '../../common/app_context_attachment';

const MAX_TITLE_LENGTH = 256;

/**
 * The id of the attachment of a panel. It is the same every time, and attachments merge by id, so
 * sending a panel to chat again replaces what the conversation knows of it, not adds a copy.
 */
export const getCustomAppAttachmentId = (embeddableId: string) =>
  `${CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE}-${embeddableId}`;

export const buildCustomAppContextAttachment = ({
  document,
  embeddableId,
  panelTitle,
}: {
  document: AppDocument;
  embeddableId: string;
  panelTitle?: string;
}): AttachmentInput<typeof CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE, CustomAppContextAttachmentData> => ({
  id: getCustomAppAttachmentId(embeddableId),
  type: CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  data: {
    embeddable_id: embeddableId,
    // Cut short rather than left to fail validation, which would stop the panel being sent at all.
    ...(panelTitle ? { panel_title: panelTitle.slice(0, MAX_TITLE_LENGTH) } : {}),
    document,
  },
});
