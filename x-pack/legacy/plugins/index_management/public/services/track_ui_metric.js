/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { trackUiMetric as track } from '../../../../../src/legacy/core_plugins/ui_metric/public';
import { UIM_APP_NAME } from '../../common/constants';

export function trackUiMetric(metricType) {
  track(UIM_APP_NAME, metricType);
}
