import template from './kbn_timepicker_recent_panel.html';
import { uiModules } from 'ui/modules';
import { timeHistory } from 'ui/timefilter/time_history';
import { prettyDuration } from 'ui/timepicker/pretty_duration';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerRecentPanel', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      setQuick: '&'
    },
    template,
    controller: function ($scope, config) {
      const getConfig = (...args) => config.get(...args);
      $scope.recent = timeHistory.get().map(time => {
        time.display = prettyDuration(time.from, time.to, getConfig);
        return time;
      });
    }
  };
});
