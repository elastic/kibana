/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, catchError, distinctUntilChanged, filter, switchMap } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { TimeRange } from '@kbn/es-query';
import type { CustomContentContextAttachmentData } from '../common/panel_context_attachment';
import {
  buildCustomContentContextAttachment,
  isCustomContentUpdatedUiEvent,
} from './utils/chat_integration';
import { registerPanelPreviewHandler } from './utils/panel_preview_registry';

export interface CustomContentPanelChatParams {
  /** Identifies the panel to the agent; updates for it are delivered to `watch` with the same id. */
  panelId: string;
  title?: string;
  template: string;
  esqlQuery?: string;
  timeRange?: TimeRange;
  esqlVariables?: ESQLControlVariable[];
}

export interface CustomContentPanelUpdate {
  template: string;
  esqlQuery: string | undefined;
}

/** Agent Builder chat for custom panels hosted outside a dashboard. */
export interface CustomContentPanelChat {
  /** Opens a new conversation with the panel attached, ready for "Generate with chat". */
  open: (params: CustomContentPanelChatParams) => void;
  /**
   * Calls `onUpdate` whenever the agent updates the panel or the user previews one of its versions
   * from the chat. Returns a function that stops watching.
   */
  watch: (panelId: string, onUpdate: (update: CustomContentPanelUpdate) => void) => () => void;
}

const toUpdate = ({
  panel_template: template,
  esql_query: esqlQuery,
}: CustomContentContextAttachmentData): CustomContentPanelUpdate => ({ template, esqlQuery });

type PanelChatAgent = Pick<AgentBuilderPluginStart, 'openChat'> & {
  events: Pick<AgentBuilderPluginStart['events'], 'getChatEvents$'> & {
    ui: Pick<AgentBuilderPluginStart['events']['ui'], 'activeConversation$'>;
  };
};

export const createPanelChat = (agentBuilder: PanelChatAgent): CustomContentPanelChat => ({
  open: ({ panelId, title, template, esqlQuery, timeRange, esqlVariables }) => {
    agentBuilder.openChat({
      newConversation: true,
      attachments: [
        buildCustomContentContextAttachment({
          template,
          esqlQuery,
          embeddableId: panelId,
          panelTitle: title,
          fetchContext: { timeRange, esqlVariables },
        }),
      ],
    });
  },
  watch: (panelId, onUpdate) => {
    const unregisterPreview = registerPanelPreviewHandler(panelId, (data) =>
      onUpdate(toUpdate(data))
    );
    const subscription = agentBuilder.events.ui.activeConversation$
      .pipe(
        distinctUntilChanged((a, b) => a?.id === b?.id),
        switchMap((conversation) =>
          conversation?.id
            ? agentBuilder.events.getChatEvents$(conversation.id).pipe(catchError(() => EMPTY))
            : EMPTY
        ),
        filter(isCustomContentUpdatedUiEvent)
      )
      .subscribe((event) => {
        const {
          data: { data },
        } = event.data;
        if (data.embeddable_id === panelId) onUpdate(toUpdate(data));
      });
    return () => {
      subscription.unsubscribe();
      unregisterPreview();
    };
  },
});
