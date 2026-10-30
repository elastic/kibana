/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomAppContextAttachmentData } from './app_context_attachment';

/**
 * Sent to the browser when an agent tool changes a custom app, so the panel can show the new app
 * while the agent's run is still in progress.
 */
export const CUSTOM_APP_UPDATED_UI_EVENT = 'custom_app:updated';

/** Sent when the agent has made an app, so that a page that can keep it may do so. */
export const CUSTOM_APP_CREATED_UI_EVENT = 'custom_app:created';

export interface CustomAppCreatedUiEventData {
  attachmentId: string;
  data: CustomAppContextAttachmentData;
}

export interface CustomAppUpdatedUiEventData {
  attachmentId: string;
  data: CustomAppContextAttachmentData;
}
