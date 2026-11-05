/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { ActiveConversation, BrowserChatEvent } from '@kbn/agent-builder-browser';
import { CUSTOM_CONTENT_UPDATED_UI_EVENT } from '../common/ui_events';
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../common/panel_context_attachment';
import { previewPanelVersion } from './utils/panel_preview_registry';
import { createPanelChat } from './panel_chat';

const updatedEvent = (embeddableId: string, template: string): BrowserChatEvent => ({
  type: ChatEventType.toolUi,
  data: {
    tool_id: 'custom_content_update_panel',
    tool_call_id: 'call-1',
    custom_event: CUSTOM_CONTENT_UPDATED_UI_EVENT,
    data: {
      attachmentId: `attachment-${embeddableId}`,
      data: { embeddable_id: embeddableId, panel_template: template, esql_query: 'FROM logs' },
    },
  },
});

const setup = () => {
  const chatEvents$ = new Subject<BrowserChatEvent>();
  const activeConversation$ = new BehaviorSubject<ActiveConversation | null>({ id: 'conv-1' });
  const openChat = jest.fn();
  const panelChat = createPanelChat({
    openChat,
    events: { ui: { activeConversation$ }, getChatEvents$: () => chatEvents$ },
  });
  return { panelChat, chatEvents$, openChat };
};

describe('createPanelChat', () => {
  it('opens a new conversation with the panel attached under its id', () => {
    const { panelChat, openChat } = setup();
    panelChat.open({ panelId: 'cell-1', title: 'Hosts', template: '', esqlQuery: 'FROM logs' });

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      attachments: [
        expect.objectContaining({
          type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
          data: expect.objectContaining({
            embeddable_id: 'cell-1',
            panel_title: 'Hosts',
            esql_query: 'FROM logs',
          }),
        }),
      ],
    });
  });

  it("delivers only the watched panel's agent updates until unwatched", () => {
    const { panelChat, chatEvents$ } = setup();
    const onUpdate = jest.fn();
    const unwatch = panelChat.watch('cell-1', onUpdate);

    chatEvents$.next(updatedEvent('other', '<p>other</p>'));
    chatEvents$.next(updatedEvent('cell-1', '<p>mine</p>'));
    unwatch();
    chatEvents$.next(updatedEvent('cell-1', '<p>late</p>'));

    expect(onUpdate.mock.calls).toEqual([[{ template: '<p>mine</p>', esqlQuery: 'FROM logs' }]]);
  });

  it('delivers versions previewed from the chat', () => {
    const { panelChat } = setup();
    const onUpdate = jest.fn();
    const unwatch = panelChat.watch('cell-1', onUpdate);

    previewPanelVersion({ embeddable_id: 'cell-1', panel_template: '<p>v1</p>' });
    unwatch();

    expect(onUpdate).toHaveBeenCalledWith({ template: '<p>v1</p>', esqlQuery: undefined });
    expect(previewPanelVersion({ embeddable_id: 'cell-1', panel_template: '' })).toBe(false);
  });
});
