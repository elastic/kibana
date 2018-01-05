import moment from 'moment';
import template from './kbn_timepicker_absolute_panel.html';
import { uiModules } from 'ui/modules';
import { timeHistory } from 'ui/timefilter/time_history';
import { TIME_MODES } from 'ui/timepicker/modes';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerAbsolutePanel', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      absolute: '=',
      applyAbsolute: '&',
      format: '=',
      pickFromDate: '=',
      pickToDate: '=',
      setToNow: '&'
    },
    template,
    controller: function ($scope) {
      $scope.history = timeHistory.getTimeHistory(TIME_MODES.ABSOLUTE);
      $scope.selectHistory = function (selectedIndex) {
        if ($scope.history[selectedIndex]) {
          $scope.absolute.from = moment($scope.history[selectedIndex].from);
          $scope.absolute.to = moment($scope.history[selectedIndex].to);
        }
      };
    }
  };
});
