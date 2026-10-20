/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { once } from 'lodash';

import {
  CUSTOM_CONTENT_PANEL_ADDED,
  CUSTOM_CONTENT_EDIT_FLYOUT_OPENED,
  CUSTOM_CONTENT_PANEL_SAVED,
  CUSTOM_CONTENT_EDIT_CANCELLED,
  CUSTOM_CONTENT_GENERATE_WITH_CHAT_CLICKED,
  CUSTOM_CONTENT_AGENT_UPDATE_APPLIED,
} from './event_types';

export const registerCustomContentAnalyticsEvents = once((analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: CUSTOM_CONTENT_PANEL_ADDED,
    schema: {
      source: {
        type: 'keyword',
        _meta: {
          description: 'How the panel was added. Possible values: dashboard_panel|agent_generated',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: CUSTOM_CONTENT_EDIT_FLYOUT_OPENED,
    schema: {
      is_new_panel: {
        type: 'boolean',
        _meta: { description: 'Whether the flyout was opened for a newly added panel.' },
      },
      has_template: {
        type: 'boolean',
        _meta: { description: 'Whether the panel already had a saved template.' },
      },
      has_esql_query: {
        type: 'boolean',
        _meta: { description: 'Whether the panel already had a saved ES|QL query.' },
      },
    },
  });

  analytics.registerEventType({
    eventType: CUSTOM_CONTENT_PANEL_SAVED,
    schema: {
      is_new_panel: {
        type: 'boolean',
        _meta: { description: 'Whether the save was the initial creation of the panel.' },
      },
      has_template: {
        type: 'boolean',
        _meta: { description: 'Whether the panel was saved with a template.' },
      },
      has_esql_query: {
        type: 'boolean',
        _meta: { description: 'Whether the panel was saved with an ES|QL query.' },
      },
      template_size_bytes: {
        type: 'long',
        _meta: { description: 'Character length of the saved template.' },
      },
    },
  });

  analytics.registerEventType({
    eventType: CUSTOM_CONTENT_EDIT_CANCELLED,
    schema: {
      is_new_panel: {
        type: 'boolean',
        _meta: { description: 'Whether the cancelled edit was for a newly added panel.' },
      },
      panel_removed: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the panel was removed from the dashboard because the new panel was never saved.',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: CUSTOM_CONTENT_GENERATE_WITH_CHAT_CLICKED,
    schema: {
      trigger_source: {
        type: 'keyword',
        _meta: {
          description: 'Where the button was clicked from. Possible values: empty_panel|flyout',
        },
      },
      has_existing_template: {
        type: 'boolean',
        _meta: {
          description: 'Whether the panel already had a template when the button was clicked.',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: CUSTOM_CONTENT_AGENT_UPDATE_APPLIED,
    schema: {
      has_esql_query: {
        type: 'boolean',
        _meta: { description: 'Whether the agent update included an ES|QL query.' },
      },
      template_size_bytes: {
        type: 'long',
        _meta: { description: 'Character length of the template provided by the agent.' },
      },
    },
  });
});
