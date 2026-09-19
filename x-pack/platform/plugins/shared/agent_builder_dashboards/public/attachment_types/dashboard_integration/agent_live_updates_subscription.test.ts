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
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';

const DASHBOARD_ID = 'dashboard-1';

const buildAttachment = (data: Record<string, unknown>) => ({
  id: 'attachment-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  origin: DASHBOARD_ID,
  current_version: 1,
  versions: [{ version: 1, data }],
});

const buildRoundCompleteEvent = (actor: 'system' | 'user') => ({
  type: ChatEventType.roundComplete,
  data: {
    attachments: [buildAttachment({ panels: [] })],
    round: {
      input: {
        attachment_refs: [
          { attachment_id: 'attachment-1', version: 1, operation: 'updated', actor },
        ],
      },
    },
  },
});

describe('createAgentLiveUpdatesSubscription', () => {
  const createHarness = () => {
    const chatEvents$ = new Subject();
    const activeConversation$ = new Subject();
    const setState = jest.fn();

    const agentBuilder = {
      events: {
        ui: { activeConversation$ },
        getChatEvents$: jest.fn().mockReturnValue(chatEvents$),
      },
    } as unknown as AgentBuilderPluginStart;

    const api = {
      savedObjectId$: { getValue: () => DASHBOARD_ID },
      setState,
    } as unknown as DashboardApi;

    const subscription = createAgentLiveUpdatesSubscription({
      agentBuilder,
      api,
      setAttachments: jest.fn(),
    });

    activeConversation$.next({ id: 'conversation-1', conversation: {} });

    return { chatEvents$, setState, subscription };
  };

  it('applies the dashboard state when an attachment is updated', () => {
    const { chatEvents$, setState, subscription } = createHarness();

    chatEvents$.next(buildRoundCompleteEvent('system'));

    expect(setState).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('does not apply the dashboard state for the ambient self-sync (user-actor) ref', () => {
    const { chatEvents$, setState, subscription } = createHarness();

    chatEvents$.next(buildRoundCompleteEvent('user'));

    expect(setState).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
