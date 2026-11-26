/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomContentContextAttachmentData } from './panel_context_attachment';

/**
 * Tool UI event sent when an agent tool updates a custom content panel context attachment,
 * so the open panel can apply the new template while the run is still in progress.
 */
export const CUSTOM_CONTENT_UPDATED_UI_EVENT = 'custom_content:updated';

export interface CustomContentUpdatedUiEventData {
  attachmentId: string;
  data: CustomContentContextAttachmentData;
}
