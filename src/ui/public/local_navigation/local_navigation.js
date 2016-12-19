import uiModules from 'ui/modules';


const module = uiModules.get('kibana');

module.directive('localNavigation', function LocalNavigation() {
  return {
    replace: true,
    restrict: 'E',
    template: '<div class="kuiLocalNav" ng-transclude></div>',
    transclude: true,
  };
});
