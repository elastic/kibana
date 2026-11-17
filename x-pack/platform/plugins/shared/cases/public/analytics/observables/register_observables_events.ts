/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  CASES_OBSERVABLES_DELETED_EVENT_TYPE,
  CASES_OBSERVABLES_EXTRACTED_EVENT_TYPE,
} from '../../../common/constants';

/**
 * Registers the browser event for observable deletion. One event per confirmed user action — a
 * bulk delete reports once whatever the number of removed observables, and a single row delete
 * also reports once. Server-side usage counters (`delete_observable`, `bulk_delete_observables`)
 * increment once per client method call across all callers (API, workflows, UI). They do not report
 * the number of removed observables. EBT adds UI-only `delete_scope` that usage counters do not capture.
 */
export const registerObservablesEvents = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  analyticsService.registerEventType({
    eventType: CASES_OBSERVABLES_DELETED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) in which the observable was deleted',
          optional: false,
        },
      },
      delete_scope: {
        type: 'keyword',
        _meta: {
          description:
            'Whether the confirmed delete removed a single observable ("single") or the ' +
            'current selection ("bulk"). The number of deleted observables is not reported',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_OBSERVABLES_EXTRACTED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description: 'The solution ID (owner) of the case on which observables were extracted',
          optional: false,
        },
      },
      status: {
        type: 'keyword',
        _meta: {
          description:
            'The outcome of the extraction: "extracted", "no_new_observables", "cap_reached", ' +
            'or "alerts_not_found"',
          optional: false,
        },
      },
      new_observables_count: {
        type: 'integer',
        _meta: {
          description: 'The number of new observables that the extraction saved on the case',
          optional: false,
        },
      },
    },
  });
};
