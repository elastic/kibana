/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DASHBOARD_PANEL_REFINE_WITH_CHAT_CLICKED = 'dashboard_panel_refine_with_chat_clicked';

/** How the action reached the chat when the user clicked "Refine with chat". */
export type RefineWithChatChatState =
  | 'new_conversation'
  | 'linked_attachment'
  | 'staged_attachment';

export interface RefineWithChatClickedEvent {
  panel_type: string;
  chat_state: RefineWithChatChatState;
  is_saved_dashboard: boolean;
}
