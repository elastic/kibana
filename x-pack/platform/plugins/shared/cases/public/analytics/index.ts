/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { registerTemplateApplyEvents } from './templates/register_apply_events';
import {
  CASE_ATTACH_EVENTS_EVENT_TYPE,
  CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE,
  CASE_PAGE_VIEW_EVENT_TYPE,
  CASE_VIEW_ATTACH_BUTTON_CLICKED_EVENT_TYPE,
  CASE_VIEW_ATTACH_MENU_ITEM_CLICKED_EVENT_TYPE,
  CASE_VIEW_ATTACHMENT_ACCORDION_OPENED_EVENT_TYPE,
  CASE_VIEW_ATTACHMENTS_SUB_TAB_CLICKED_EVENT_TYPE,
  CASE_VIEW_ATTACHMENTS_TAB_CLICKED_EVENT_TYPE,
  CASES_LIST_PAGE_VIEW_EVENT_TYPE,
  CASES_LIST_VIEW_MODE_CHANGED_EVENT_TYPE,
  CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE,
} from '../../common/constants';
import { CASE_WORKFLOW_RUN_ORIGIN_TYPES } from '../../common/constants/workflow';
import { registerTemplateAnalytics } from './templates';

export const registerAnalytics = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  registerTemplateApplyEvents({ analyticsService });

  analyticsService.registerEventType({
    eventType: CASE_PAGE_VIEW_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) that rendered the Cases page',
          optional: false,
        },
      },
      workflow_run_availability: {
        type: 'keyword',
        _meta: {
          description:
            'Whether the "Run workflow" action is available to the current user on this case, ' +
            'and if not, the first blocking reason. One of: "available", "no_update_privilege", ' +
            '"config_disabled", "ui_setting_disabled", "no_execute_privilege".',
          optional: true,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASE_ATTACH_EVENTS_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) that created event attachments',
          optional: false,
        },
      },
      attachment_source: {
        type: 'keyword',
        _meta: {
          description: 'The exact place in the app where the attachment comes from',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASE_VIEW_ATTACHMENTS_TAB_CLICKED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the attachments tab is accessed',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASE_VIEW_ATTACHMENTS_SUB_TAB_CLICKED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the attachments tab is accessed',
          optional: false,
        },
      },
      attachment_type: {
        type: 'keyword',
        _meta: {
          description: 'Which attachments type is rendered in the sub tab',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASE_VIEW_ATTACHMENT_ACCORDION_OPENED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description:
            'The solution ID (owner) in which the redesigned attachments accordion was opened',
          optional: false,
        },
      },
      attachment_type: {
        type: 'keyword',
        _meta: {
          description: 'Which attachments type the opened accordion renders',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASE_VIEW_ATTACH_BUTTON_CLICKED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the attach button was clicked',
          optional: false,
        },
      },
      attach_location: {
        type: 'keyword',
        _meta: {
          description:
            'Where the attach button was clicked, either "activity" or "attachments" tab',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASE_VIEW_ATTACH_MENU_ITEM_CLICKED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the attach menu item was clicked',
          optional: false,
        },
      },
      attachment_type: {
        type: 'keyword',
        _meta: {
          description:
            'The attach menu option selected, either "file", "timeline" or "saved_object"',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the markdown editor plugin was clicked',
          optional: false,
        },
      },
      plugin_type: {
        type: 'keyword',
        _meta: {
          description: 'The markdown editor plugin clicked, either "lens" or "timeline"',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_LIST_VIEW_MODE_CHANGED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the cases list view mode was changed',
          optional: false,
        },
      },
      view_mode: {
        type: 'keyword',
        _meta: {
          description: 'The cases list view mode the user switched to, either "list" or "table"',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_LIST_PAGE_VIEW_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) that rendered the cases list page',
          optional: false,
        },
      },
      view_mode: {
        type: 'keyword',
        _meta: {
          description: 'The cases list view mode active on load, either "list" or "table"',
          optional: false,
        },
      },
      selected_columns: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'A column/field currently selected for display in the cases list. Built-in ' +
              'fields use stable names (e.g. "status", "severity"). Custom field columns are ' +
              'included as their per-space UUID key (max 36 chars); at most ' +
              'MAX_CUSTOM_FIELDS_PER_CASE (10) distinct custom field keys can appear per space',
          },
        },
        _meta: {
          description:
            'The columns (table view) or fields (list view) currently selected for display',
          optional: false,
        },
      },
      per_page: {
        type: 'integer',
        _meta: {
          description: 'The number of rows selected per page in the cases list',
          optional: false,
        },
      },
      sort_field: {
        type: 'keyword',
        _meta: {
          description:
            'The case field the list is sorted by at load time, e.g. "createdAt" or "severity"',
          optional: false,
        },
      },
      sort_order: {
        type: 'keyword',
        _meta: {
          description: 'The sort direction at load time, either "asc" or "desc"',
          optional: false,
        },
      },
      active_filter_dimensions: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'A bounded filter dimension name (e.g. "status", "severity", "customFields") ' +
              'that is actively applied to the cases list at load time. Underlying filter ' +
              'values are never reported, only the dimension name',
          },
        },
        _meta: {
          description: 'The bounded set of filter dimensions actively applied at load time',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_WORKFLOW_RUN_TRIGGERED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the workflow was triggered',
          optional: false,
        },
      },
      origin_type: {
        type: 'keyword',
        _meta: {
          description:
            `The surface from which the workflow was triggered. One of: ${[
              ...CASE_WORKFLOW_RUN_ORIGIN_TYPES,
              'bulk',
            ].join(', ')}. ` +
            '"bulk" means the run was started from the cases-list bulk action without a specific case origin.',
          optional: false,
        },
      },
      case_count: {
        type: 'integer',
        _meta: {
          description:
            'Number of cases included in this workflow run (1 for single-case surfaces, >1 for list bulk).',
          optional: false,
        },
      },
      tag_filter_active: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the owner has configured available workflow tags in Case Settings, ' +
            'causing the workflow picker to be pre-filtered. Tag values are never reported.',
          optional: false,
        },
      },
    },
  });

  registerTemplateAnalytics({ analyticsService });
};
