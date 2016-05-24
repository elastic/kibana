import moment from 'moment';
import UiModules from 'ui/modules';
import chromeNavControlsRegistry from 'ui/registry/chrome_nav_controls';
import { once, clone } from 'lodash';

import toggleHtml from './kbn_global_timepicker.html';

UiModules
.get('kibana')
.directive('kbnGlobalTimepicker', (timefilter, globalState, $rootScope, config) => {
  const listenForUpdates = once($scope => {
    $scope.$listen(timefilter, 'update', (newVal, oldVal) => {
      globalState.time = clone(timefilter.time);
      globalState.refreshInterval = clone(timefilter.refreshInterval);
      globalState.save();
    });
  });

  return {
    template: toggleHtml,
    link: ($scope, $el, attrs) => {
      config.bindToScope($scope, 'dateFormat:dow', 'dateFormat_dow');
      $scope.$watch('dateFormat_dow', function (day) {
        const dow = moment.weekdays().indexOf(day);
        moment.locale(moment.locale(), { week: { dow } });
      });

      listenForUpdates($rootScope);

      $rootScope.timefilter = timefilter;
      $rootScope.toggleRefresh = () => {
        timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
      };
    },
  };
});
