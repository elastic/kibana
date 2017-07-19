import _ from 'lodash';
import template from './kbn_timepicker_quick_panel.html';
import { uiModules } from 'ui/modules';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerQuickPanel', function (quickRanges) {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      setQuick: '&'
    },
    template,
    controller: function ($scope) {
      $scope.quickLists = _(quickRanges).groupBy('section').values().value();
    }
  };
});
