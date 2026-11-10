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
  {
    isNewConversation = false,
    isManaged = false,
    canWriteDashboards = true,
    stagedAttachmentIds = ['attachment-1'],
  }: {
    isNewConversation?: boolean;
    isManaged?: boolean;
    canWriteDashboards?: boolean;
    stagedAttachmentIds?: string[];
  } = {}
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
  const toasts = { addWarning: jest.fn(), addError: jest.fn() };
  const onOtherDashboardUpdated = jest.fn();

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
    canWriteDashboards,
    dashboardLocator,
    toasts: toasts as unknown as NotificationsStart['toasts'],
    isStagedFromDashboard: (attachmentId) => stagedAttachmentIds.includes(attachmentId),
    onOtherDashboardUpdated,
    upsertAttachment,
  });

  return {
    onOtherDashboardUpdated,
    chatEvents$,
    activeConversation$,
    getChatEvents$,
    setState,
    dashboardLocator,
    toasts,
    upsertAttachment,
    subscription,
  };
};

describe('createAgentLiveUpdatesSubscription', () => {
  it.each([
    ['applies it to the linked saved dashboard', 'dashboard-1', 'dashboard-1', {}, 1, 0],
    ['applies it to an unsaved dashboard', undefined, undefined, {}, 1, 0],
    [
      'tells the user about a different saved dashboard',
      'dashboard-1',
      'other-dashboard',
      {},
      0,
      1,
    ],
    [
      "skips a different saved dashboard silently when the user can't write dashboards",
      'dashboard-1',
      'other-dashboard',
      { canWriteDashboards: false },
      0,
      0,
    ],
    [
      'tells the user about an unlinked attachment the open managed dashboard did not stage',
      'managed-dashboard',
      undefined,
      { isManaged: true, stagedAttachmentIds: [] },
      0,
      1,
    ],
  ])('upserts the attachment and %s', (_, savedObjectId, origin, options, applied, notified) => {
    const { chatEvents$, setState, upsertAttachment, onOtherDashboardUpdated, subscription } =
      createHarness(savedObjectId, options);
    const attachment = buildAttachment(origin);

    chatEvents$.next(buildToolUiEvent(attachment));

    expect(upsertAttachment).toHaveBeenCalledWith(attachment);
    expect(setState).toHaveBeenCalledTimes(applied);
    expect(onOtherDashboardUpdated).toHaveBeenCalledTimes(notified);
    subscription.unsubscribe();
  });

  it.each([
    ['linked to it', 'managed-dashboard'],
    ['it staged without a link', undefined],
  ])(
    'opens a single new dashboard for repeated updates when viewing a managed dashboard the attachment is %s',
    async (_, origin) => {
      const { chatEvents$, setState, dashboardLocator, toasts, subscription } = createHarness(
        'managed-dashboard',
        { isManaged: true }
      );

      chatEvents$.next(buildToolUiEvent(buildAttachment(origin)));
      chatEvents$.next(buildToolUiEvent(buildAttachment(origin)));
      await new Promise(process.nextTick);

      expect(setState).not.toHaveBeenCalled();
      expect(dashboardLocator.navigate).toHaveBeenCalledTimes(1);
      expect(dashboardLocator.navigate).toHaveBeenCalledWith(
        expect.not.objectContaining({ dashboardId: expect.anything() })
      );
      expect(toasts.addWarning).toHaveBeenCalledTimes(1);
      subscription.unsubscribe();
    }
  );

  it("warns only once that the changes weren't applied when the user can't write dashboards", async () => {
    const { chatEvents$, setState, toasts, subscription } = createHarness(undefined, {
      canWriteDashboards: false,
    });

    chatEvents$.next(buildToolUiEvent(buildAttachment(undefined)));
    chatEvents$.next(buildToolUiEvent(buildAttachment(undefined)));
    await new Promise(process.nextTick);

    expect(setState).not.toHaveBeenCalled();
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
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

  it('shows an error toast when the changes fail to apply', async () => {
    const { chatEvents$, setState, toasts, subscription } = createHarness('dashboard-1');
    const error = new Error('Panel failed to load');
    setState.mockRejectedValue(error);

    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1')));
    await new Promise(process.nextTick);

    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: "Couldn't apply the agent's changes to the dashboard",
    });
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
