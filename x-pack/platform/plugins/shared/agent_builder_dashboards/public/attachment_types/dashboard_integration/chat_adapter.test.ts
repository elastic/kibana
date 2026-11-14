/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_UPDATED_UI_EVENT } from '../../../common';
import { createChatAdapter } from './chat_adapter';
import type { IdGenerator } from '..';

const buildAttachment = (origin?: string): DashboardAttachment => ({
  id: 'attachment-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  origin,
  data: { title: 'Agent dashboard', panels: [] },
});

const buildToolUiEvent = (
  attachment: DashboardAttachment,
  customEvent = DASHBOARD_UPDATED_UI_EVENT
) => ({
  type: ChatEventType.toolUi,
  data: { tool_id: 'tool', tool_call_id: 'call', custom_event: customEvent, data: { attachment } },
});

const createHarness = ({ isNewConversation = false }: { isNewConversation?: boolean } = {}) => {
  const chatEvents$ = new Subject();
  const activeConversation$ = new BehaviorSubject<{ id?: string }>({
    id: isNewConversation ? undefined : 'conversation-1',
  });
  const getChatEvents$ = jest.fn().mockReturnValue(chatEvents$);
  const onDashboardUpdate = jest.fn();

  const chat = createChatAdapter({
    agentBuilder: {
      events: { ui: { activeConversation$ }, getChatEvents$ },
    } as unknown as AgentBuilderPluginStart,
    draftAttachmentId: { current: 'draft-1', next: jest.fn() } as unknown as IdGenerator,
    getUpdateOrigin: () => undefined,
  });
  const subscription = chat.dashboardUpdates$.subscribe(onDashboardUpdate);

  return { chatEvents$, activeConversation$, getChatEvents$, onDashboardUpdate, subscription };
};

describe('createChatAdapter dashboardUpdates$', () => {
  it('emits the attachment the agent updated', () => {
    const { chatEvents$, onDashboardUpdate, subscription } = createHarness();
    const attachment = buildAttachment('dashboard-1');

    chatEvents$.next(buildToolUiEvent(attachment));

    expect(onDashboardUpdate).toHaveBeenCalledWith(attachment);
    subscription.unsubscribe();
  });

  it('emits the updates from the first run of a new conversation', () => {
    const { chatEvents$, activeConversation$, getChatEvents$, onDashboardUpdate, subscription } =
      createHarness({ isNewConversation: true });
    expect(getChatEvents$).not.toHaveBeenCalled();

    // The chat creates the conversation before sending, so its id is published before the run streams
    activeConversation$.next({ id: 'new-conversation' });
    chatEvents$.next(buildToolUiEvent(buildAttachment()));

    expect(getChatEvents$).toHaveBeenCalledWith('new-conversation');
    expect(onDashboardUpdate).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('ignores other UI events and chat events', () => {
    const { chatEvents$, onDashboardUpdate, subscription } = createHarness();

    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1'), 'workflow:yaml_changed'));
    chatEvents$.next({ type: ChatEventType.roundComplete, data: {} });

    expect(onDashboardUpdate).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
