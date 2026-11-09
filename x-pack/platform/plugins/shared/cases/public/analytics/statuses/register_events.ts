/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  CASES_STATUS_CHANGED_EVENT_TYPE,
  CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE,
} from '../../../common/constants';

const owner = {
  type: 'keyword' as const,
  _meta: { description: 'The solution ID (owner) of the case or configuration', optional: false },
};

const category = {
  type: 'keyword' as const,
  _meta: {
    description: 'The built-in status the affected status belongs to: open, in-progress, or closed',
    optional: false,
  },
};

export const registerStatusEvents = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  analyticsService.registerEventType({
    eventType: CASES_STATUS_CHANGED_EVENT_TYPE,
    schema: {
      owner,
      category,
      is_custom: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the case moved to an admin-defined status rather than a built-in one',
          optional: false,
        },
      },
      entry_point: {
        type: 'keyword',
        _meta: {
          description:
            'The bounded place in the UI the status was changed from: case_view_header, ' +
            'case_view_sidebar, case_view_activity_button, list_row_action, or list_bulk_action',
          optional: false,
        },
      },
      pauses_time_tracking: {
        type: 'boolean',
        _meta: {
          description: 'Whether the status the case moved to pauses time tracking',
          optional: true,
        },
      },
      pause_reason: {
        type: 'keyword',
        _meta: {
          description:
            'The pause reason when it is one of the seeded defaults, otherwise "custom". ' +
            'Configured reason text is never reported',
          optional: true,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE,
    schema: {
      owner,
      category,
      action: {
        type: 'keyword',
        _meta: {
          description:
            'The edit made in the statuses settings: added, renamed, reordered, default_changed, ' +
            'disabled, enabled, pausing_changed, or reasons_edited. No label or key is reported',
          optional: false,
        },
      },
    },
  });
};
