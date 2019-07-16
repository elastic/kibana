/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { METRIC_TYPE } from '@kbn/analytics';
import { UIM_APP_NAME } from '../../constants';
import { createUiStatsReporter } from '../../../../../../../../src/legacy/core_plugins/ui_metric/public';

class UiMetricService {
  track?: ReturnType<typeof createUiStatsReporter>;

  public init = (getReporter: typeof createUiStatsReporter): void => {
    this.track = getReporter(UIM_APP_NAME);
  };

  public trackUiMetric = (eventName: string): void => {
    if (!this.track) throw Error('UiMetricService not initialized.');
    return this.track(METRIC_TYPE.COUNT, eventName);
  };
}

export const uiMetricService = new UiMetricService();
