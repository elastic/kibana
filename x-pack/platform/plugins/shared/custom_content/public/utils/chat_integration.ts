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

export const buildCustomContentContextAttachment = (
  template: string,
  esqlQuery: string | undefined,
  embeddableId: string,
  panelTitle?: string
): AttachmentInput<
  typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData
> => ({
  type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  data: {
    panel_template: template,
    esql_query: esqlQuery,
    panel_title: panelTitle,
    embeddable_id: embeddableId,
  },
});
