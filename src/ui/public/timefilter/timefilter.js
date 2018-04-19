import _ from 'lodash';
import moment from 'moment';
import dateMath from '@kbn/datemath';
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

    Timefilter.prototype.get = function (indexPattern, timeRange) {

      if (!indexPattern) {
      //in CI, we sometimes seem to fail here.
        return;
      }

      let filter;
      const timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, { name: indexPattern.timeFieldName });

      if (timefield) {
        const bounds = timeRange ? this.calculateBounds(timeRange) : this.getBounds();
        filter = { range: {} };
        filter.range[timefield.name] = {
          gte: bounds.min.valueOf(),
          lte: bounds.max.valueOf(),
          format: 'epoch_millis'
        };
      }

      return filter;
    };

    Timefilter.prototype.getBounds = function () {
      return this.calculateBounds(this.time);
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

    Timefilter.prototype.calculateBounds = function (timeRange) {
      const forceNow = this.getForceNow();

      return {
        min: dateMath.parse(timeRange.from, { forceNow }),
        max: dateMath.parse(timeRange.to, { roundUp: true, forceNow })
      };
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
