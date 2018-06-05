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

import _ from 'lodash';
import moment from 'moment';
import { calculateBounds, getTime } from './get_time';
import { parseQueryString } from './lib/parse_querystring';
import { diffTimeFactory } from './lib/diff_time';
import { diffIntervalFactory } from './lib/diff_interval';
import { SimpleEmitter } from 'ui/utils/simple_emitter';
import uiRoutes from '../routes';
import chrome from 'ui/chrome';

class Timefilter extends SimpleEmitter {
  constructor() {
    super();
    const self = this;
    this.diffTime = diffTimeFactory(self);
    this.diffInterval = diffIntervalFactory(self);
    this.isTimeRangeSelectorEnabled = false;
    this.isAutoRefreshSelectorEnabled = false;
    this._time = chrome.getUiSettingsClient().get('timepicker:timeDefaults');
    this._refreshInterval = chrome.getUiSettingsClient().get('timepicker:refreshIntervalDefaults');
  }

  getTime = () => {
    return this._time;
  }

  /**
   * Updates timefilter time.
   * @param {Object} time
   * @param {string|moment} from
   * @param {string|moment} to
   * @param {string} mode
   */
  setTime = (time) => {
    this._time = Object.assign(this._time, time);
    this.diffTime();
  }

  getRefreshInterval = () => {
    return this._refreshInterval;
  }

  /**
   * Set timefilter refresh interval.
   * @param {Object} refreshInterval
   * @param {number} value
   * @param {boolean} pause
   */
  setRefreshInterval = (refreshInterval) => {
    this._refreshInterval = Object.assign(this._refreshInterval, refreshInterval);
    this.diffInterval();
  }

  toggleRefresh = () => {
    this.setRefreshInterval({ pause: !this._refreshInterval.pause });
  }

  createFilter = (indexPattern, timeRange) => {
    return getTime(indexPattern, timeRange ? timeRange : this.time, this.getForceNow());
  }

  getBounds = () => {
    return this.calculateBounds(this._time);
  }

  getForceNow = () => {
    const forceNow = parseQueryString().forceNow;
    if (!forceNow) {
      return;
    }

    const ticks = Date.parse(forceNow);
    if (isNaN(ticks)) {
      throw new Error(`forceNow query parameter, ${forceNow}, can't be parsed by Date.parse`);
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

// TODO
// remove everything underneath once globalState is no longer an angular service
// and listener can be registered without angular.
function convertISO8601(stringTime) {
  const obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
  return obj.isValid() ? obj : stringTime;
}

const registerWithGlobalState = _.once((globalState) => {
  const uiSettings = chrome.getUiSettingsClient();
  const timeDefaults = uiSettings.get('timepicker:timeDefaults');
  const refreshIntervalDefaults = uiSettings.get('timepicker:refreshIntervalDefaults');

  timefilter.setTime(_.defaults(globalState.time || {}, timeDefaults));
  timefilter.setRefreshInterval(_.defaults(globalState.refreshInterval || {}, refreshIntervalDefaults));

  globalState.on('fetch_with_changes', () => {
  // clone and default to {} in one
    const newTime = _.defaults({}, globalState.time, timeDefaults);
    const newRefreshInterval = _.defaults({}, globalState.refreshInterval, refreshIntervalDefaults);

    if (newTime) {
      if (newTime.to) newTime.to = convertISO8601(newTime.to);
      if (newTime.from) newTime.from = convertISO8601(newTime.from);
    }

    timefilter.setTime(newTime);
    timefilter.setRefreshInterval(newRefreshInterval);
  });
});

uiRoutes
  .addSetupWork((globalState) => {
    return registerWithGlobalState(globalState);
  });
