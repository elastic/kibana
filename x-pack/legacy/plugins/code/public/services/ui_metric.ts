/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  createUiStatsReporter,
  METRIC_TYPE,
} from '../../../../../../src/legacy/core_plugins/ui_metric/public';
import { APP_USAGE_TYPE } from '../../common/constants';

export const trackCodeUiMetric = createUiStatsReporter(APP_USAGE_TYPE);
export { METRIC_TYPE };
