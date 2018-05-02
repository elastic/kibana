import _ from 'lodash';
import template from './kbn_timepicker_quick_panel.html';
import { uiModules } from '../../modules';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerQuickPanel', function (config) {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      setQuick: '&'
    },
    template,
    controller: function ($scope) {
      const quickRanges = config.get('timepicker:quickRanges');
      $scope.quickLists = _(quickRanges).groupBy('section').values().value();
    }
  };
});
