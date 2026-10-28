/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
  CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
  CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
} from '../../../common/constants';

/**
 * Registers the browser events for managing field definitions from the Field Library page. Each
 * event reports one write the server confirmed, so it measures Field Library activity rather than
 * write volume: the server-side counters already count an attempt for every caller.
 *
 * The two planes deliberately disagree, and each answers what the other cannot. The counters include
 * rejected writes, cover the API as well as the browser, and increment once per definition in the
 * owner's global list per reorder; these events cover confirmed writes from this one page, leave
 * reorder out, and carry the solution owner. Neither plane sees the writes that go straight through
 * the service — the configure path and the v1 to v2 migration — so the snapshot stays the source of
 * truth for how many definitions exist. The counters split only create into global and reusable, so
 * `is_global` is reported on update too, which is what makes a field promoted or demoted visible.
 */
export const registerFieldLibraryManagementEvents = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  analyticsService.registerEventType({
    eventType: CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the field definition was created',
          optional: false,
        },
      },
      is_global: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the created field definition applies to every case ("global") rather than ' +
            'only to the templates that reference it. No field name, label, description, or YAML ' +
            'definition is reported',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the field definition was updated',
          optional: false,
        },
      },
      is_global: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the saved field definition applies to every case ("global") rather than only ' +
            'to the templates that reference it. Reported on update as well as create so that a ' +
            'field promoted to global, or demoted from it, is visible. No field name, label, ' +
            'description, or YAML definition is reported',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the field definition was deleted',
          optional: false,
        },
      },
    },
  });
};
