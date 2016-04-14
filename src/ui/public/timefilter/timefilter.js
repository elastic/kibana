define(function (require) {
  require('ui/routes')
  .addSetupWork(function (timefilter) {
    return timefilter.init();
  });

  require('ui/modules')
  .get('kibana')
  .service('timefilter', function (Private, globalState, $rootScope, config) {

    let _ = require('lodash');
    let angular = require('angular');
    let moment = require('moment');
    let dateMath = require('ui/utils/dateMath');
    let Events = Private(require('ui/events'));
    let diff = Private(require('ui/utils/diff_time_picker_vals'));

    require('ui/state_management/global_state');

    function convertISO8601(stringTime) {
      let obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      return obj.isValid() ? obj : stringTime;
    }

    _.class(Timefilter).inherits(Events);
    function Timefilter() {
      Timefilter.Super.call(this);

      let self = this;
      let diffTime = Private(require('ui/timefilter/lib/diff_time'))(self);
      let diffInterval = Private(require('ui/timefilter/lib/diff_interval'))(self);

      self.enabled = false;

      self.init = _.once(function () {
        return config.init()
        .then(self.consumeDefaults);
      });

      self.consumeDefaults = _.once(function () {
        let timeDefaults = config.get('timepicker:timeDefaults');
        let refreshIntervalDefaults = config.get('timepicker:refreshIntervalDefaults');

        // These can be date math strings or moments.
        self.time = _.defaults(globalState.time || {}, timeDefaults);
        self.refreshInterval = _.defaults(globalState.refreshInterval || {}, refreshIntervalDefaults);

        globalState.on('fetch_with_changes', function () {
          // clone and default to {} in one
          let newTime = _.defaults({}, globalState.time, timeDefaults);
          let newRefreshInterval = _.defaults({}, globalState.refreshInterval, refreshIntervalDefaults);

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

    Timefilter.prototype.get = function (indexPattern) {
      let filter;
      let timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, {name: indexPattern.timeFieldName});

      if (timefield) {
        let bounds = this.getBounds();
        filter = {range : {}};
        filter.range[timefield.name] = {
          gte: bounds.min.valueOf(),
          lte: bounds.max.valueOf(),
          format: 'epoch_millis'
        };
      }

      return filter;
    };

    Timefilter.prototype.getBounds = function (timefield) {
      return {
        min: dateMath.parse(this.time.from),
        max: dateMath.parse(this.time.to, true)
      };
    };

    Timefilter.prototype.getActiveBounds = function () {
      if (this.enabled) return this.getBounds();
    };

    return new Timefilter();
  });

});
