/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { CASE_PAGE_VIEW_EVENT_TYPE } from '../../common/constants';

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
};
