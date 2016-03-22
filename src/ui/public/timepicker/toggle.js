import UiModules from 'ui/modules';
import chromeNavControlsRegistry from 'ui/registry/chrome_nav_controls';
import { once, clone } from 'lodash';

import toggleHtml from './toggle.html';

UiModules
.get('kibana')
.directive('kbnGlobalTimepicker', (timefilter, globalState) => {
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
      listenForUpdates($scope);

      $scope.timefilter = timefilter;
      $scope.toggleRefresh = () => {
        timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
      };
    },
  };
});
