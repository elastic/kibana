/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { ESQL_VIEWS_PAGE_VISITED, ESQL_VIEW_DELETED, ESQL_VIEW_EDITED } from './constants';

const sourceSchema = {
  type: 'keyword' as const,
  _meta: {
    description: 'The UI surface the event originates from, e.g. stack_management.',
  },
};

/** Registers the analytics events reported by the ES|QL views management application. */
export const registerEsqlViewsAnalyticsEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType({
    eventType: ESQL_VIEWS_PAGE_VISITED,
    schema: {},
  });

  analytics.registerEventType({
    eventType: ESQL_VIEW_EDITED,
    schema: {
      source: sourceSchema,
    },
  });

  // One event per delete operation, not per view.
  analytics.registerEventType({
    eventType: ESQL_VIEW_DELETED,
    schema: {
      source: sourceSchema,
      count: {
        type: 'long',
        _meta: { description: 'Number of views submitted in the delete operation.' },
      },
    },
  });
};
