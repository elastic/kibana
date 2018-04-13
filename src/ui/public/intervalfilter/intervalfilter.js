import _ from 'lodash';
import 'ui/state_management/global_state';
import 'ui/config';
import { EventsProvider } from 'ui/events';
import { IntervalfilterLibDiffIntervalProvider } from 'ui/intervalfilter/lib/diff_interval';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';

uiRoutes
  .addSetupWork(function (intervalfilter) {
    return intervalfilter.init();
  });

uiModules
  .get('kibana')
  .service('intervalfilter', function (Private, globalState, $rootScope, config) {
    const Events = Private(EventsProvider);

    _.class(IntervalFilter).inherits(Events);
    function IntervalFilter() {
      IntervalFilter.Super.call(this);

      const self = this;
      const diffInterval = Private(IntervalfilterLibDiffIntervalProvider)(self);

      self.dateInterval = {};
      self.enabled = false;

      self.init = _.once(function () {
        const dateIntervalDefaults = config.get('datefilter:dateIntervalDefaults');

        self.dateInterval = _.defaults(globalState.dateInterval || {}, dateIntervalDefaults);

        globalState.on('fetch_with_changes', function () {
          const newDateInterval = _.defaults({}, globalState.dateInterval, dateIntervalDefaults);
          self.dateInterval = newDateInterval;
        });
      });

      $rootScope.$$intervalfilter = self;

      $rootScope.$watchMulti(['$$intervalfilter.dateInterval'], diffInterval);
    }

    IntervalFilter.prototype.enableIntervalFilter = function () {
      this.enabled = true;
    };

    IntervalFilter.prototype.disableIntervalFilter = function () {
      this.enabled = false;
    };

    return new IntervalFilter();
  });
