/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';
import { once } from 'lodash';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED, type AddToChatClickedEvent } from './event_types';

export type { AddToChatChatState, AddToChatClickedEvent } from './event_types';

export const registerAgentBuilderDashboardsAnalyticsEvents = once(
  (analytics: AnalyticsServiceSetup) => {
    analytics.registerEventType({
      eventType: DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED,
      schema: {
        panel_type: {
          type: 'keyword',
          _meta: {
            description: 'Embeddable type of the panel sent to chat, e.g. lens|custom_content.',
          },
        },
        chat_state: {
          type: 'keyword',
          _meta: {
            description:
              'How the panel reached the chat. Possible values: new_conversation|linked_attachment|staged_attachment|canvas',
          },
        },
        is_saved_dashboard: {
          type: 'boolean',
          _meta: {
            description: 'Whether the dashboard had a saved object id when the action ran.',
          },
        },
      },
    });
  }
);

/**
 * Reports an "Add to chat" click as the shared agent builder event and the dashboard detail event;
 * telemetry failures never break the action.
 */
export const reportAddToChatClicked = (
  analytics: AnalyticsServiceStart,
  event: AddToChatClickedEvent,
  attachmentTypes: readonly string[]
): void => {
  try {
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, {
      pathway: 'dashboard_panel',
      attachments: [...attachmentTypes],
    });
    analytics.reportEvent(DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED, { ...event });
  } catch {
    // never break the action on telemetry errors
  }
};
