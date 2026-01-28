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
  CASE_VIEW_ATTACHMENTS_SUB_TAB_CLICKED_EVENT_TYPE,
  CASE_VIEW_ATTACHMENTS_TAB_CLICKED_EVENT_TYPE,
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
};
