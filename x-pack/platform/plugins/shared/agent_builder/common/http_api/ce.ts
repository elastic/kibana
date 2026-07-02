/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Max items per `POST /internal/agent_builder/ce/_attach` (matches `ce_attach` tool). */
export const CE_HTTP_ATTACH_ITEMS_MAX = 50;

/**
 * Response body for `POST /internal/agent_builder/ce/_attach` (internal only).
 */
export interface CeAttachHttpResponse {
  results: CeAttachHttpResultItem[];
}

export type CeAttachHttpResultItem = CeAttachHttpSuccessItem | CeAttachHttpErrorItem;

export interface CeAttachHttpSuccessItem {
  success: true;
  entry_id: string;
  conversation_attachment_id: string;
  attachment_type: string;
  message: string;
}

export interface CeAttachHttpErrorItem {
  success: false;
  entry_id: string;
  attachment_type?: string;
  message: string;
}
