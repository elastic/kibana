/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { calculateBounds, getTime } from './get_time';
import { diffTimeFactory } from './lib/diff_time';
import { diffIntervalFactory } from './lib/diff_interval';
import { SimpleEmitter } from 'ui/utils/simple_emitter';

class Timefilter extends SimpleEmitter {
  constructor() {
    super();
    this.diffTime = diffTimeFactory(self);
    this.diffInterval = diffIntervalFactory(self);
    this.isTimeRangeSelectorEnabled = false;
    this.isAutoRefreshSelectorEnabled = false;
    this._time = uiSettings.get('timepicker:timeDefaults');
    this._refreshInterval = uiSettings.get('timepicker:refreshIntervalDefaults');
  }

  getTime = () => {
    return this._time;
  }

  /**
   * Updates timeFilter time.
   * @param {Object} time
   * @param {string|moment} from
   * @param {string|moment} to
   * @param {string} mode
   */
  setTime = (time) => {
    this._time = Objects.assign(this._time, time);
    diffTime();
  }

  getRefreshInterval = () => {
    return this._time;
  }

  /**
   * Set timefilter refresh interval.
   * @param {Object} refreshInterval
   * @param {number} value
   * @param {boolean} pause
   */
  setRefreshInterval = (refreshInterval) => {
    this._refreshInterval = Objects.assign(this._refreshInterval, refreshInterval);
    diffInterval();
  }

  toggleRefresh = () => {
    this.setRefreshInterval({ pause: !this._refreshInterval.pause });
  }

  createFilter = (indexPattern, timeRange) => {
    return getTime(indexPattern, timeRange ? timeRange : this.time, this.getForceNow());
  }

  getBounds = () {
    return this.calculateBounds(this._time);
  }

  getForceNow = () => {
    const query = $location.search().forceNow;
    if (!query) {
      return;
    }

    const ticks = Date.parse(query);
    if (isNaN(ticks)) {
      throw new Error(`forceNow query parameter can't be parsed`);
    }
    return new Date(ticks);
  }

  calculateBounds = (timeRange) => {
    return calculateBounds(timeRange, { forceNow: this.getForceNow() });
  }

  getActiveBounds = () => {
    if (this.isTimeRangeSelectorEnabled) {
      return this.getBounds();
    }
  }

  /**
   * Show the time bounds selector part of the time filter
   */
  enableTimeRangeSelector = () => {
    this.isTimeRangeSelectorEnabled = true;
  }

  /**
   * Hide the time bounds selector part of the time filter
   */
  disableTimeRangeSelector = () => {
    this.isTimeRangeSelectorEnabled = false;
  }

  /**
   * Show the auto refresh part of the time filter
   */
  enableAutoRefreshSelector = () => {
    this.isAutoRefreshSelectorEnabled = true;
  }

  /**
   * Hide the auto refresh part of the time filter
   */
  disableAutoRefreshSelector = () => {
    this.isAutoRefreshSelectorEnabled = false;
  }

}

export const timefilter = new Timefilter();
