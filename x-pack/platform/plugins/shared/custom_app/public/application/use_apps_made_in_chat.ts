/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { isToolUiEvent, type ToolUiEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart, BrowserChatEvent } from '@kbn/agent-builder-browser';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import {
  CUSTOM_APP_CREATED_UI_EVENT,
  type CustomAppCreatedUiEventData,
} from '../../common/ui_events';
import { getChatEvents$ } from '../utils/chat_ui_events';

const isCustomAppCreatedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof CUSTOM_APP_CREATED_UI_EVENT, CustomAppCreatedUiEventData> =>
  isToolUiEvent(event, CUSTOM_APP_CREATED_UI_EVENT);

/**
 * Tells of every app the agent makes in the chat while the page is open, whichever way the chat was
 * opened, so that the page can keep it. Each app is told of once, however often its event comes.
 */
export const useAppsMadeInChat = ({
  agentBuilder,
  isEnabled,
  onCreated,
}: {
  agentBuilder?: AgentBuilderPluginStart;
  /** Whether the person may keep what the agent makes. When they may not, the card is all they get. */
  isEnabled: boolean;
  onCreated: (app: { title?: string; document: AppDocument }) => void;
}) => {
  const told = useRef(new Set<string>());

  useEffect(() => {
    if (!agentBuilder || !isEnabled) return;

    const subscription = getChatEvents$(agentBuilder).subscribe((event) => {
      if (!isCustomAppCreatedUiEvent(event)) return;
      const { attachmentId, data } = event.data.data;
      if (told.current.has(attachmentId)) return;

      const parsed = appDocumentSchema.safeParse(data.document);
      if (!parsed.success) return;
      told.current.add(attachmentId);
      onCreated({ title: data.panel_title, document: parsed.data });
    });

    return () => subscription.unsubscribe();
  }, [agentBuilder, isEnabled, onCreated]);
};
