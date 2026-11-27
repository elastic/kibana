/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
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

/**
 * The id of the attachment of a page that shows an app. It has no panel, so the agent changes it by
 * this id, and the page knows which answers are its own by it.
 */
export const createPageAttachmentId = () =>
  `${CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE}-page-${uuidv4()}`;

export const buildCustomAppContextAttachment = ({
  document,
  embeddableId,
  attachmentId,
  panelTitle,
}: {
  document: AppDocument;
  /** For an app in a panel of a dashboard. */
  embeddableId?: string;
  /** For an app on its own page, which has no panel. */
  attachmentId?: string;
  panelTitle?: string;
}): AttachmentInput<typeof CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE, CustomAppContextAttachmentData> => ({
  id: embeddableId ? getCustomAppAttachmentId(embeddableId) : attachmentId,
  type: CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE,
  data: {
    ...(embeddableId ? { embeddable_id: embeddableId } : {}),
    // Cut short rather than left to fail validation, which would stop the panel being sent at all.
    ...(panelTitle ? { panel_title: panelTitle.slice(0, MAX_TITLE_LENGTH) } : {}),
    document,
  },
});
