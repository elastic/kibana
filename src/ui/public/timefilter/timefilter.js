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
import { parseQueryString } from 'ui/timefilter/lib/parse_querystring';
import { SimpleEmitter } from 'ui/utils/simple_emitter';
import uiRoutes from '../routes';
import chrome from 'ui/chrome';
import { areTimePickerValsDifferent } from './lib/diff_time_picker_vals';
import { timeHistory } from './time_history';

class Timefilter extends SimpleEmitter {
  constructor() {
    super();
    this.isTimeRangeSelectorEnabled = false;
    this.isAutoRefreshSelectorEnabled = false;
    this._time = chrome.getUiSettingsClient().get('timepicker:timeDefaults');
    this.setRefreshInterval(chrome.getUiSettingsClient().get('timepicker:refreshIntervalDefaults'));
  }

  getTime = () => {
    const { from, to } = this._time;
    return {
      ...this._time,
      from: moment.isMoment(from) ? from.toISOString() : from,
      to: moment.isMoment(to) ? to.toISOString() : to
    };
  }

  /**
   * Updates timefilter time.
   * Emits 'timeUpdate' and 'fetch' events when time changes
   * @param {Object} time
   * @property {string|moment} time.from
   * @property {string|moment} time.to
   * @property {string} time.mode (quick | relative | absolute)
   */
  setTime = (time) => {
    // Object.assign used for partially composed updates
    const newTime = Object.assign(this.getTime(), time);
    if (areTimePickerValsDifferent(this.getTime(), newTime)) {
      this._time = {
        from: newTime.from,
        to: newTime.to,
        mode: newTime.mode
      };
      timeHistory.add(this._time);
      this.emit('timeUpdate');
      this.emit('fetch');
    }
  }

  getRefreshInterval = () => {
    return _.clone(this._refreshInterval);
  }

  /**
   * Set timefilter refresh interval.
   * @param {Object} refreshInterval
   * @property {number} time.value Refresh interval in milliseconds. Positive integer
   * @property {boolean} time.pause
   */
  setRefreshInterval = (refreshInterval) => {
    const prevRefreshInterval = this.getRefreshInterval();
    const newRefreshInterval = { ...prevRefreshInterval, ...refreshInterval };
    // If the refresh interval is <= 0 handle that as a paused refresh
    if (newRefreshInterval.value <= 0) {
      newRefreshInterval.value = 0;
      newRefreshInterval.pause = true;
    }
    this._refreshInterval = {
      value: newRefreshInterval.value,
      pause: newRefreshInterval.pause
    };
    // Only send out an event if we already had a previous refresh interval (not for the initial set)
    // and the old and new refresh interval are actually different.
    if (prevRefreshInterval && areTimePickerValsDifferent(prevRefreshInterval, newRefreshInterval)) {
      this.emit('refreshIntervalUpdate');
      if (!newRefreshInterval.pause && newRefreshInterval.value !== 0) {
        this.emit('fetch');
      }
    }
  }

  toggleRefresh = () => {
    this.setRefreshInterval({ pause: !this._refreshInterval.pause });
  }

  createFilter = (indexPattern, timeRange) => {
    return getTime(indexPattern, timeRange ? timeRange : this._time, this.getForceNow());
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
    this.emit('enabledUpdated');
  }

  /**
   * Hide the time bounds selector part of the time filter
   */
  disableTimeRangeSelector = () => {
    this.isTimeRangeSelectorEnabled = false;
    this.emit('enabledUpdated');
  }

  /**
   * Show the auto refresh part of the time filter
   */
  enableAutoRefreshSelector = () => {
    this.isAutoRefreshSelectorEnabled = true;
    this.emit('enabledUpdated');
  }

  /**
   * Hide the auto refresh part of the time filter
   */
  disableAutoRefreshSelector = () => {
    this.isAutoRefreshSelectorEnabled = false;
    this.emit('enabledUpdated');
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

// Currently some parts of Kibana (index patterns, timefilter) rely on addSetupWork in the uiRouter
// and require it to be executed to properly function.
// This function is exposed for applications that do not use uiRoutes like APM
// Kibana issue https://github.com/elastic/kibana/issues/19110 tracks the removal of this dependency on uiRouter
export const registerTimefilterWithGlobalState = _.once((globalState, $rootScope) => {
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

  const updateGlobalStateWithTime = () => {
    globalState.time = timefilter.getTime();
    globalState.refreshInterval = timefilter.getRefreshInterval();
    globalState.save();
  };

  $rootScope.$listenAndDigestAsync(timefilter, 'refreshIntervalUpdate', updateGlobalStateWithTime);

  $rootScope.$listenAndDigestAsync(timefilter, 'timeUpdate', updateGlobalStateWithTime);
});

uiRoutes
  .addSetupWork((globalState, $rootScope) => {
    return registerTimefilterWithGlobalState(globalState, $rootScope);
  });
