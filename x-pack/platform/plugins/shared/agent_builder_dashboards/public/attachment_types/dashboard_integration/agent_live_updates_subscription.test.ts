/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { NotificationsStart } from '@kbn/core/public';
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

const createHarness = (
  savedObjectId: string | undefined,
  { isNewConversation = false, isManaged = false } = {}
) => {
  const chatEvents$ = new Subject();
  const activeConversation$ = new BehaviorSubject<{ id?: string }>({
    id: isNewConversation ? undefined : 'conversation-1',
  });
  const getChatEvents$ = jest.fn().mockReturnValue(chatEvents$);
  const setState = jest.fn();
  const setViewMode = jest.fn();
  const upsertAttachment = jest.fn();
  const dashboardLocator = { navigate: jest.fn(), getRedirectUrl: jest.fn() };
  const toasts = { addWarning: jest.fn() };

  const subscription = createAgentLiveUpdatesSubscription({
    agentBuilder: {
      events: { ui: { activeConversation$ }, getChatEvents$ },
    } as unknown as AgentBuilderPluginStart,
    api: {
      savedObjectId$: { getValue: () => savedObjectId },
      getAppContext: () => ({ currentAppId: 'dashboards' }),
      isEditableByUser: true,
      isManaged,
      setState,
      setViewMode,
    } as unknown as DashboardApi,
    canWriteDashboards: true,
    dashboardLocator,
    toasts: toasts as unknown as NotificationsStart['toasts'],
    upsertAttachment,
  });

  return {
    chatEvents$,
    activeConversation$,
    getChatEvents$,
    setState,
    setViewMode,
    dashboardLocator,
    toasts,
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

  it('switches the dashboard to edit mode when applying the changes', () => {
    const { chatEvents$, setViewMode, subscription } = createHarness('dashboard-1');

    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1')));

    expect(setViewMode).toHaveBeenCalledWith('edit');
    subscription.unsubscribe();
  });

  it('opens the changes in a new dashboard instead of changing a managed dashboard', async () => {
    const { chatEvents$, setState, dashboardLocator, toasts, subscription } = createHarness(
      'dashboard-1',
      { isManaged: true }
    );

    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1')));
    await new Promise(process.nextTick);

    expect(setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.not.objectContaining({ dashboardId: expect.anything() })
    );
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('opens the changes of an unlinked attachment in a new dashboard when viewing a managed dashboard', async () => {
    const { chatEvents$, setState, dashboardLocator, subscription } = createHarness(
      'managed-dashboard',
      { isManaged: true }
    );

    chatEvents$.next(buildToolUiEvent(buildAttachment(undefined)));
    await new Promise(process.nextTick);

    expect(setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('applies the dashboard state from the first run of a new conversation', () => {
    const { chatEvents$, activeConversation$, getChatEvents$, setState, subscription } =
      createHarness(undefined, { isNewConversation: true });
    expect(getChatEvents$).not.toHaveBeenCalled();

    // The chat creates the conversation before sending, so its id is published before the run streams
    activeConversation$.next({ id: 'new-conversation' });
    chatEvents$.next(buildToolUiEvent(buildAttachment()));

    expect(getChatEvents$).toHaveBeenCalledWith('new-conversation');
    expect(setState).toHaveBeenCalledTimes(1);
    expect(setViewMode).toHaveBeenCalledWith('edit');
    expect(setState).toHaveBeenCalledWith(expect.anything(), { changedBy: ['agent'] });
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
