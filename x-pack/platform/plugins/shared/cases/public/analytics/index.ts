/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  CASE_ATTACH_EVENTS_EVENT_TYPE,
  CASE_PAGE_VIEW_EVENT_TYPE,
  CASE_VIEW_ATTACHMENT_ACCORDION_OPENED_EVENT_TYPE,
  CASE_VIEW_ATTACHMENTS_SUB_TAB_CLICKED_EVENT_TYPE,
  CASE_VIEW_ATTACHMENTS_TAB_CLICKED_EVENT_TYPE,
  CASES_LIST_PAGE_VIEW_EVENT_TYPE,
  CASES_LIST_VIEW_MODE_CHANGED_EVENT_TYPE,
} from '../../common/constants';

export const registerAnalytics = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
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
};
