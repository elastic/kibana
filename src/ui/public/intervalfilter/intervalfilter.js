import _ from 'lodash';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import 'ui/config';
import { EventsProvider } from 'ui/events';
import { IntervalfilterLibDiffIntervalProvider } from 'ui/intervalfilter/lib/diff_interval';

uiRoutes
.addSetupWork(function (intervalfilter) {
  return intervalfilter.init();
});

uiModules
.get('kibana')
.service('intervalfilter', function (Private, globalState, $rootScope, config) {
  const Events = Private(EventsProvider);
  const dateIntervalDefaults = config.get('datefilter:dateIntervalDefaults');

  class IntervalFilter extends Events {
    constructor() {
      super();
      this.dateInterval = {};
      this.enabled = false;
      this.isFilterInit = false;
    }
    init() {
      if(this.isFilterInit) return;
      const self = this;
      const diffInterval = Private(IntervalfilterLibDiffIntervalProvider)(self);

      this.dateInterval = _.defaults({}, dateIntervalDefaults);

      globalState.on('fetch_with_changes', function () {
        const newDateInterval = _.defaults({}, globalState.dateInterval, dateIntervalDefaults);
        self.dateInterval = newDateInterval;
      });

      $rootScope.$$intervalfilter = self;

      $rootScope.$watchMulti([
        '$$intervalfilter.dateInterval'
      ], diffInterval);

      this.isFilterInit = true;
    }
  }

  return new IntervalFilter();
});
