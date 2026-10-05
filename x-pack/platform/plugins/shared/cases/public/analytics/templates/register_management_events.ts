/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  CASES_TEMPLATE_CREATED_EVENT_TYPE,
  CASES_TEMPLATE_DELETED_EVENT_TYPE,
  CASES_TEMPLATE_UPDATED_EVENT_TYPE,
} from '../../../common/constants';

/**
 * Registers the browser events for managing the templates themselves — create, update, and delete on
 * the template management pages. Applying a template to a case is a separate event family with its
 * own register module. Each event reports one confirmed user action, so it is never a count of
 * templates written: a bulk delete reports once whatever the number of removed templates, and the
 * YAML import flow reports nothing. The server-side template counters remain the totals, because
 * they count every caller (API, workflows) rather than the UI alone.
 */
export const registerTemplateManagementEvents = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  analyticsService.registerEventType({
    eventType: CASES_TEMPLATE_CREATED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the template was created',
          optional: false,
        },
      },
      entry_point: {
        type: 'keyword',
        _meta: {
          description:
            'The bounded place in the templates UI the create was confirmed from, either ' +
            '"template_editor" or "templates_list"',
          optional: false,
        },
      },
      creation_mode: {
        type: 'keyword',
        _meta: {
          description:
            'How the new template started, either "blank" (authored in the YAML editor) or ' +
            '"clone" (copied from an existing template). No template name, tag, author, or ' +
            'definition content is reported',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_TEMPLATE_UPDATED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the template was updated',
          optional: false,
        },
      },
      entry_point: {
        type: 'keyword',
        _meta: {
          description:
            'The bounded place in the templates UI the update was confirmed from, either ' +
            '"template_editor" (a save in the editor) or "templates_list" (the enabled toggle ' +
            'on a row). No template name, tag, author, or definition content is reported',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_TEMPLATE_DELETED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the template was deleted',
          optional: false,
        },
      },
      entry_point: {
        type: 'keyword',
        _meta: {
          description:
            'The bounded place in the templates UI the delete was confirmed from, currently ' +
            'always "templates_list"',
          optional: false,
        },
      },
      delete_scope: {
        type: 'keyword',
        _meta: {
          description:
            'Whether the confirmed delete removed a single row ("single") or the current ' +
            'selection ("bulk"). The number of deleted templates is not reported',
          optional: false,
        },
      },
    },
  });
};
