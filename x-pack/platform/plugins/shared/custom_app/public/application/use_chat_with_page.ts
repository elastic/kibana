/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { isToolUiEvent, type ToolUiEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart, BrowserChatEvent } from '@kbn/agent-builder-browser';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import {
  CUSTOM_APP_UPDATED_UI_EVENT,
  type CustomAppUpdatedUiEventData,
} from '../../common/ui_events';
import { getChatEvents$ } from '../utils/chat_ui_events';
import { buildCustomAppContextAttachment, createPageAttachmentId } from '../utils/chat_integration';

const isCustomAppUpdatedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof CUSTOM_APP_UPDATED_UI_EVENT, CustomAppUpdatedUiEventData> =>
  isToolUiEvent(event, CUSTOM_APP_UPDATED_UI_EVENT);

interface Options {
  agentBuilder?: AgentBuilderPluginStart;
  /** The app as it stands, which the agent starts from. */
  getDocument: () => AppDocument;
  /** What the agent made: the page takes it as a change that is not saved yet. */
  onDocument: (document: AppDocument) => void;
}

/**
 * Lets the page talk to the assistant. The app it shows goes with the conversation as an
 * attachment of its own, and what the agent makes of it comes back here, to be shown on the page
 * as it is on a dashboard panel, instead of being left in the chat. Absent when chat is not there.
 */
export const useChatWithPage = ({ agentBuilder, getDocument, onDocument }: Options) => {
  // One for as long as the page is open, so that every answer about it is known by it.
  const attachmentId = useRef<string>();
  if (!attachmentId.current) attachmentId.current = createPageAttachmentId();

  useEffect(() => {
    if (!agentBuilder) return;

    const subscription = getChatEvents$(agentBuilder).subscribe((event) => {
      if (!isCustomAppUpdatedUiEvent(event)) return;
      const { attachmentId: answeredId, data } = event.data.data;
      if (answeredId !== attachmentId.current) return;

      const parsed = appDocumentSchema.safeParse(data.document);
      if (parsed.success) onDocument(parsed.data);
    });

    return () => subscription.unsubscribe();
  }, [agentBuilder, onDocument]);

  const describe = useCallback(
    (message: string) =>
      agentBuilder?.openChat({
        newConversation: true,
        initialMessage: message,
        attachments: [
          buildCustomAppContextAttachment({
            document: getDocument(),
            attachmentId: attachmentId.current,
          }),
        ],
      }),
    [agentBuilder, getDocument]
  );

  return agentBuilder ? describe : undefined;
};
