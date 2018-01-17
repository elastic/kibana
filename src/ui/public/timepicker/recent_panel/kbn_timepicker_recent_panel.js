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
      $scope.quickLists = [];
      const history = timeHistory.get().map(time => {
        time.display = prettyDuration(time.from, time.to, getConfig);
        return time;
      });
      if (history.length > 5) {
        // Put history in two evenly sized sections.
        // When history.length is odd, make first list have extra item
        const halfIndex = Math.ceil(history.length / 2);
        $scope.quickLists.push(history.slice(0, halfIndex));
        $scope.quickLists.push(history.slice(halfIndex));
      } else if (history.length > 0) {
        // Put history in single column. Do not put empty history in quickLists
        $scope.quickLists.push(history);
      }
    }
  };
});
