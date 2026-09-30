/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_UPDATED_UI_EVENT } from '../../../common';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';

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

const createHarness = (savedObjectId: string | undefined, isNewConversation = false) => {
  const chatEvents$ = new Subject();
  const activeConversation$ = new BehaviorSubject<{ id?: string }>({
    id: isNewConversation ? undefined : 'conversation-1',
  });
  const getChatEvents$ = jest.fn().mockReturnValue(chatEvents$);
  const setState = jest.fn();
  const upsertAttachment = jest.fn();

  const subscription = createAgentLiveUpdatesSubscription({
    agentBuilder: {
      events: { ui: { activeConversation$ }, getChatEvents$ },
    } as unknown as AgentBuilderPluginStart,
    api: { savedObjectId$: { getValue: () => savedObjectId }, setState } as unknown as DashboardApi,
    upsertAttachment,
  });

  return {
    chatEvents$,
    activeConversation$,
    getChatEvents$,
    setState,
    upsertAttachment,
    subscription,
  };
};

describe('createAgentLiveUpdatesSubscription', () => {
  it.each([
    ['the linked saved dashboard', 'dashboard-1', 'dashboard-1', 1],
    ['an unsaved dashboard', undefined, undefined, 1],
    ['a different saved dashboard', 'dashboard-1', 'other-dashboard', 0],
  ])(
    'upserts the attachment and applies the state only for its own dashboard: %s',
    (_, savedObjectId, origin, calls) => {
      const { chatEvents$, setState, upsertAttachment, subscription } =
        createHarness(savedObjectId);
      const attachment = buildAttachment(origin);

      chatEvents$.next(buildToolUiEvent(attachment));

      expect(upsertAttachment).toHaveBeenCalledWith(attachment);
      expect(setState).toHaveBeenCalledTimes(calls);
      subscription.unsubscribe();
    }
  );

  it('applies the dashboard state from the first run of a new conversation', () => {
    const { chatEvents$, activeConversation$, getChatEvents$, setState, subscription } =
      createHarness(undefined, true);
    expect(getChatEvents$).not.toHaveBeenCalled();

    // The chat creates the conversation before sending, so its id is published before the run streams
    activeConversation$.next({ id: 'new-conversation' });
    chatEvents$.next(buildToolUiEvent(buildAttachment()));

    expect(getChatEvents$).toHaveBeenCalledWith('new-conversation');
    expect(setState).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('ignores other UI events and chat events', () => {
    const { chatEvents$, setState, upsertAttachment, subscription } = createHarness('dashboard-1');

    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1'), 'workflow:yaml_changed'));
    chatEvents$.next({ type: ChatEventType.roundComplete, data: {} });

    expect(upsertAttachment).not.toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
