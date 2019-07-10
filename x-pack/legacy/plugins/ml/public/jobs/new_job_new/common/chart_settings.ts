/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timefilter } from 'ui/timefilter';
// @ts-ignore
import { IntervalHelperProvider } from '../../../util/ml_time_buckets';

export class ChartSettings {
  private _interval: any;
  private PAGE_WIDTH: number;
  private BAR_TARGET: number;
  private MAX_BARS: number;

  constructor(pageWidth: number) {
    this.PAGE_WIDTH = pageWidth; // angular.element('.single-metric-job-container').width();
    this.BAR_TARGET = this.PAGE_WIDTH > 2000 ? 1000 : this.PAGE_WIDTH / 2;
    this.MAX_BARS = this.BAR_TARGET + (this.BAR_TARGET / 100) * 100; // 100% larger than bar target

    const MlTimeBuckets = IntervalHelperProvider();
    this._interval = new MlTimeBuckets();
    this._interval.setBarTarget(this.BAR_TARGET);
    this._interval.setMaxBars(this.MAX_BARS);
    this._interval.setInterval('auto');

    // @ts-ignore: incomplete kibana types
    const bounds = timefilter.getActiveBounds();
    this._interval.setBounds(bounds);
  }

  public get intervalSeconds(): number {
    return this._interval.getInterval().asSeconds();
  }
}
