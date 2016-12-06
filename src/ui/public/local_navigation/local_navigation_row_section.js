import uiModules from 'ui/modules';

import './local_navigation.less';


const module = uiModules.get('kibana');

module.directive('localNavigationRowSection', function LocalNavigationRowSection() {
  return {
    replace: true,
    restrict: 'E',
    template: '<div class="localNavRow__section" ng-transclude></div>',
    transclude: true,
  };
});
