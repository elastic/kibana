import moment from 'moment';
import template from './kbn_timepicker_recent_panel.html';
import { uiModules } from 'ui/modules';
import { timeHistory } from 'ui/timefilter/time_history';

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
      $scope.quickLists = [];
      const history = timeHistory.get().map(time => {
        time.display = `${formatDate(time.from)} to ${formatDate(time.to)}`;
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

      function formatDate(dateString) {
        if (dateString.includes('now')) {
          // relative date
          return dateString;
        }

        return moment(dateString).format(config.get('dateFormat'));
      }
    }
  };
});
