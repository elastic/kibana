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
import '../state_management/global_state';
import '../config';
import { EventsProvider } from '../events';
import { TimefilterLibDiffTimeProvider } from './lib/diff_time';
import { TimefilterLibDiffIntervalProvider } from './lib/diff_interval';
import uiRoutes from '../routes';
import { uiModules } from '../modules';
import { createLegacyClass } from '../utils/legacy_class';

uiRoutes
  .addSetupWork(function (timefilter) {
    return timefilter.init();
  });

uiModules
  .get('kibana')
  .service('timefilter', function (Private, globalState, $rootScope, config, $location) {
    const Events = Private(EventsProvider);

    function convertISO8601(stringTime) {
      const obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      return obj.isValid() ? obj : stringTime;
    }

    createLegacyClass(Timefilter).inherits(Events);
    function Timefilter() {
      Timefilter.Super.call(this);

      const self = this;
      const diffTime = Private(TimefilterLibDiffTimeProvider)(self);
      const diffInterval = Private(TimefilterLibDiffIntervalProvider)(self);

      self.isTimeRangeSelectorEnabled = false;
      self.isAutoRefreshSelectorEnabled = false;

      self.init = _.once(function () {
        const timeDefaults = config.get('timepicker:timeDefaults');
        const refreshIntervalDefaults = config.get('timepicker:refreshIntervalDefaults');

        // These can be date math strings or moments.
        self.time = _.defaults(globalState.time || {}, timeDefaults);
        self.refreshInterval = _.defaults(globalState.refreshInterval || {}, refreshIntervalDefaults);

        globalState.on('fetch_with_changes', function () {
        // clone and default to {} in one
          const newTime = _.defaults({}, globalState.time, timeDefaults);
          const newRefreshInterval = _.defaults({}, globalState.refreshInterval, refreshIntervalDefaults);

          if (newTime) {
            if (newTime.to) newTime.to = convertISO8601(newTime.to);
            if (newTime.from) newTime.from = convertISO8601(newTime.from);
          }

          self.time = newTime;
          self.refreshInterval = newRefreshInterval;
        });
      });

      $rootScope.$$timefilter = self;

      $rootScope.$watchMulti([
        '$$timefilter.time',
        '$$timefilter.time.from',
        '$$timefilter.time.to',
        '$$timefilter.time.mode'
      ], diffTime);

      $rootScope.$watchMulti([
        '$$timefilter.refreshInterval',
        '$$timefilter.refreshInterval.pause',
        '$$timefilter.refreshInterval.value'
      ], diffInterval);
    }

    Timefilter.prototype.update = function () {
      $rootScope.$apply();
    };

    Timefilter.prototype.getForceNow = function () {
      const query = $location.search().forceNow;
      if (!query) {
        return;
      }

      const ticks = Date.parse(query);
      if (isNaN(ticks)) {
        throw new Error(`forceNow query parameter can't be parsed`);
      }
      return new Date(ticks);
    };

    Timefilter.prototype.get = function (indexPattern, timeRange) {
      return getTime(indexPattern, timeRange ? timeRange : this.time, this.getForceNow());
    };

    Timefilter.prototype.calculateBounds = function (timeRange) {
      return calculateBounds(timeRange, { forceNow: this.getForceNow() });
    };

    Timefilter.prototype.getBounds = function () {
      return this.calculateBounds(this.time);
    };

    Timefilter.prototype.getActiveBounds = function () {
      if (this.isTimeRangeSelectorEnabled) {
        return this.getBounds();
      }
    };

    /**
     * Show the time bounds selector part of the time filter
     */
    Timefilter.prototype.enableTimeRangeSelector = function () {
      this.isTimeRangeSelectorEnabled = true;
    };

    /**
     * Hide the time bounds selector part of the time filter
     */
    Timefilter.prototype.disableTimeRangeSelector = function () {
      this.isTimeRangeSelectorEnabled = false;
    };

    /**
     * Show the auto refresh part of the time filter
     */
    Timefilter.prototype.enableAutoRefreshSelector = function () {
      this.isAutoRefreshSelectorEnabled = true;
    };

    /**
     * Hide the auto refresh part of the time filter
     */
    Timefilter.prototype.disableAutoRefreshSelector = function () {
      this.isAutoRefreshSelectorEnabled = false;
    };

    return new Timefilter();
  });
