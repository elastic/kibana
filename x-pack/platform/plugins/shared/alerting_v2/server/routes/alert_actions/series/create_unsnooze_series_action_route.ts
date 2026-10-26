/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  createUnsnoozeSeriesActionBodySchema,
  errorResponseSchema,
} from '@kbn/alerting-v2-schemas';
import { createUnsnoozeSeriesActionOasExamples } from './create_unsnooze_series_action_oas_example';
import { createSeriesActionRouteForType } from './create_series_action_route_for_type';

export const CreateUnsnoozeSeriesActionRoute = createSeriesActionRouteForType({
  actionType: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
  pathSuffix: '_unsnooze',
  summary: 'Unsnooze an alert episode series',
  bodySchema: createUnsnoozeSeriesActionBodySchema,
  oasOperationObject: createUnsnoozeSeriesActionOasExamples,
  access: 'internal' as const,
  additionalResponses: {
    409: {
      body: () => errorResponseSchema,
      description: 'Indicates the alert episode series is not snoozed.',
    },
  },
});
