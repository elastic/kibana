/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_UPDATED_UI_EVENT } from '../../../common';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';

const DASHBOARD_ID = 'dashboard-1';

const buildAttachment = (origin: string | undefined = DASHBOARD_ID): DashboardAttachment => ({
  id: 'attachment-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  origin,
  data: { title: 'Agent dashboard', panels: [] },
});

const buildToolUiEvent = (customEvent: string, attachment: DashboardAttachment) => ({
  type: ChatEventType.toolUi,
  data: {
    tool_id: 'platform.dashboard.generate_dashboard',
    tool_call_id: 'tool-call-1',
    custom_event: customEvent,
    data: { attachment },
  },
});

describe('createAgentLiveUpdatesSubscription', () => {
  const createHarness = (savedObjectId: string | undefined = DASHBOARD_ID) => {
    const chatEvents$ = new Subject();
    const activeConversation$ = new Subject();
    const setState = jest.fn();
    const upsertAttachment = jest.fn();

    const agentBuilder = {
      events: {
        ui: { activeConversation$ },
        getChatEvents$: jest.fn().mockReturnValue(chatEvents$),
      },
    } as unknown as AgentBuilderPluginStart;

    const api = {
      savedObjectId$: { getValue: () => savedObjectId },
      setState,
    } as unknown as DashboardApi;

    const subscription = createAgentLiveUpdatesSubscription({
      agentBuilder,
      api,
      upsertAttachment,
    });

    activeConversation$.next({ id: 'conversation-1', conversation: {} });

    return { chatEvents$, setState, upsertAttachment, subscription };
  };

  it('applies the dashboard state and upserts the attachment on a dashboard updated UI event', () => {
    const { chatEvents$, setState, upsertAttachment, subscription } = createHarness();
    const attachment = buildAttachment();

    chatEvents$.next(buildToolUiEvent(DASHBOARD_UPDATED_UI_EVENT, attachment));

    expect(upsertAttachment).toHaveBeenCalledWith(attachment);
    expect(setState).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('applies the dashboard state on an unsaved dashboard', () => {
    const { chatEvents$, setState, subscription } = createHarness(undefined);

    chatEvents$.next(buildToolUiEvent(DASHBOARD_UPDATED_UI_EVENT, buildAttachment(undefined)));

    expect(setState).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('does not apply the dashboard state when the attachment is linked to another dashboard', () => {
    const { chatEvents$, setState, upsertAttachment, subscription } = createHarness();

    chatEvents$.next(
      buildToolUiEvent(DASHBOARD_UPDATED_UI_EVENT, buildAttachment('other-dashboard'))
    );

    expect(upsertAttachment).toHaveBeenCalledTimes(1);
    expect(setState).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('ignores other UI events and chat events', () => {
    const { chatEvents$, setState, upsertAttachment, subscription } = createHarness();

    chatEvents$.next(buildToolUiEvent('workflow:yaml_changed', buildAttachment()));
    chatEvents$.next({ type: ChatEventType.roundComplete, data: {} });

    expect(upsertAttachment).not.toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
