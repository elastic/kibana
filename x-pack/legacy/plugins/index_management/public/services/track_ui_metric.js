/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUiMetricUri } from '../../../../common/ui_metric';
import { UIM_APP_NAME } from '../../common/constants';
import { getHttpClient } from './api';

export function trackUiMetric(metricType) {
  const uiMetricUri = createUiMetricUri(UIM_APP_NAME, metricType);
  getHttpClient().post(uiMetricUri);
}
