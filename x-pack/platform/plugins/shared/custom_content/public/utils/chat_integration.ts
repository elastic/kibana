/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';

/**
 * Deterministic per-panel attachment id. Attachments are merged by `id` and anything without one is
 * appended, so a stable id lets a re-pushed panel context replace the previous snapshot instead of
 * accumulating duplicates — which the update tool would then read the stalest of.
 */
const getCustomContentAttachmentId = (embeddableId: string) =>
  `${CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE}-${embeddableId}`;

export const buildCustomContentContextAttachment = (
  template: string,
  esqlQuery: string | undefined,
  embeddableId: string,
  panelTitle?: string
): AttachmentInput<
  typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData
> => ({
  id: getCustomContentAttachmentId(embeddableId),
  type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  data: {
    panel_template: template,
    esql_query: esqlQuery,
    panel_title: panelTitle,
    embeddable_id: embeddableId,
  },
});
