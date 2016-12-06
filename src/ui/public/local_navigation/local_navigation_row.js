import uiModules from 'ui/modules';

import './local_navigation.less';


const module = uiModules.get('kibana');

module.directive('localNavigationRow', function LocalNavigationRow() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      isSecondary: '=?',
    },
    template: `<div class="localNavRow" ng-class="{ 'localNavigationRow--secondary': isSecondary }" ng-transclude></div>`,
    transclude: true,
  };
});
