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

const createHarness = (
  savedObjectId: string | undefined,
  {
    isNewConversation = false,
    stagedAttachmentIds = ['attachment-1'],
  }: {
    isNewConversation?: boolean;
    stagedAttachmentIds?: string[];
  } = {}
) => {
  const chatEvents$ = new Subject();
  const activeConversation$ = new BehaviorSubject<{ id?: string }>({
    id: isNewConversation ? undefined : 'conversation-1',
  });
  const getChatEvents$ = jest.fn().mockReturnValue(chatEvents$);
  const upsertAttachment = jest.fn();
  const onOpenDashboardUpdated = jest.fn().mockResolvedValue('applied');
  const onOtherDashboardUpdated = jest.fn();

  const subscription = createAgentLiveUpdatesSubscription({
    agentBuilder: {
      events: { ui: { activeConversation$ }, getChatEvents$ },
    } as unknown as AgentBuilderPluginStart,
    api: { savedObjectId$: { getValue: () => savedObjectId } } as unknown as DashboardApi,
    isStagedFromDashboard: (attachmentId) => stagedAttachmentIds.includes(attachmentId),
    upsertAttachment,
    onOpenDashboardUpdated,
    onOtherDashboardUpdated,
  });

  return {
    onOpenDashboardUpdated,
    onOtherDashboardUpdated,
    chatEvents$,
    activeConversation$,
    getChatEvents$,
    upsertAttachment,
    subscription,
  };
};

describe('createAgentLiveUpdatesSubscription', () => {
  it.each([
    ['routes it to the linked saved dashboard', 'dashboard-1', 'dashboard-1', {}, 1, 0],
    ['routes it to an unsaved dashboard', undefined, undefined, {}, 1, 0],
    [
      'routes an unlinked attachment to the saved dashboard that staged it',
      'managed-dashboard',
      undefined,
      {},
      1,
      0,
    ],
    ['reports a different saved dashboard', 'dashboard-1', 'other-dashboard', {}, 0, 1],
    [
      'reports an unlinked attachment the open saved dashboard did not stage',
      'managed-dashboard',
      undefined,
      { stagedAttachmentIds: [] },
      0,
      1,
    ],
  ])('upserts the attachment and %s', (_, savedObjectId, origin, options, routed, reported) => {
    const {
      chatEvents$,
      upsertAttachment,
      onOpenDashboardUpdated,
      onOtherDashboardUpdated,
      subscription,
    } = createHarness(savedObjectId, options);
    const attachment = buildAttachment(origin);

    chatEvents$.next(buildToolUiEvent(attachment));

    expect(upsertAttachment).toHaveBeenCalledWith(attachment);
    expect(onOpenDashboardUpdated).toHaveBeenCalledTimes(routed);
    expect(onOtherDashboardUpdated).toHaveBeenCalledTimes(reported);
    subscription.unsubscribe();
  });

  it('routes updates one at a time and stops once one opens in a new dashboard', async () => {
    const { chatEvents$, onOpenDashboardUpdated, upsertAttachment, subscription } =
      createHarness('dashboard-1');
    let resolveFirstUpdate: (outcome: string) => void = () => {};
    onOpenDashboardUpdated.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstUpdate = resolve;
      })
    );

    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1')));
    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1')));
    expect(onOpenDashboardUpdated).toHaveBeenCalledTimes(1);

    resolveFirstUpdate('opened-new-dashboard');
    await new Promise(process.nextTick);
    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1')));

    expect(onOpenDashboardUpdated).toHaveBeenCalledTimes(1);
    expect(upsertAttachment).toHaveBeenCalledTimes(2);
    expect(subscription.closed).toBe(true);
  });

  it('routes the updates from the first run of a new conversation', () => {
    const {
      chatEvents$,
      activeConversation$,
      getChatEvents$,
      onOpenDashboardUpdated,
      subscription,
    } = createHarness(undefined, { isNewConversation: true });
    expect(getChatEvents$).not.toHaveBeenCalled();

    // The chat creates the conversation before sending, so its id is published before the run streams
    activeConversation$.next({ id: 'new-conversation' });
    chatEvents$.next(buildToolUiEvent(buildAttachment()));

    expect(getChatEvents$).toHaveBeenCalledWith('new-conversation');
    expect(onOpenDashboardUpdated).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('ignores other UI events and chat events', () => {
    const { chatEvents$, onOpenDashboardUpdated, upsertAttachment, subscription } =
      createHarness('dashboard-1');

    chatEvents$.next(buildToolUiEvent(buildAttachment('dashboard-1'), 'workflow:yaml_changed'));
    chatEvents$.next({ type: ChatEventType.roundComplete, data: {} });

    expect(upsertAttachment).not.toHaveBeenCalled();
    expect(onOpenDashboardUpdated).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
