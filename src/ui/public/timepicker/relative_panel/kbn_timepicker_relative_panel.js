import template from './kbn_timepicker_relative_panel.html';
import { uiModules } from 'ui/modules';
import { timeHistory } from 'ui/timefilter/time_history';
import { TIME_MODES } from 'ui/timepicker/modes';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerRelativePanel', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      applyRelative: '&',
      checkRelative: '&',
      formatRelative: '&',
      relative: '=',
      relativeOptions: '=',
      setRelativeToNow: '&',
      setRelative: '&',
      units: '='
    },
    template,
    controller: function ($scope) {
      $scope.history = timeHistory.getTimeHistory(TIME_MODES.RELATIVE);
      $scope.selectHistory = function (selectedIndex) {
        if ($scope.history[selectedIndex]) {
          $scope.setRelative({
            from: $scope.history[selectedIndex].from,
            to: $scope.history[selectedIndex].to
          });
        }
      };
    }
  };
});
