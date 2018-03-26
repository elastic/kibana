import _ from 'lodash';
import { uiModules } from 'ui/modules';
import html from 'ui/intervalpicker/intervalpicker.html';
import 'ui/intervalpicker/kbn_global_intervalpicker';
import 'ui/intervalpicker/date_ranges';
import 'ui/intervalpicker/intervalpicker.less';

uiModules
  .get('kibana')
  .directive('kbnIntervalpicker', function (dateRange) {
    return {
      restrict: 'E',
      scope: {
        interval: '=',
        onDateIntervalSelect: '&'
      },
      template: html,
      controller: ($scope) => {

        $scope.dateLists = _(dateRange).groupBy('section').values().value();

        $scope.setInterval = function (interval) {
          interval = _.clone(_.omit(interval, ['$$hashKey']) || {});
          $scope.onDateIntervalSelect({ interval });
        };
      }
    };
  });
