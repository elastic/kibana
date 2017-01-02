import uiModules from 'ui/modules';


const module = uiModules.get('kibana');

module.directive('localNavigationRow', function LocalNavigationRow() {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      isSecondary: '=?',
    },
    template: `<div class="kuiLocalNavRow" ng-class="{ 'kuiLocalNavRow--secondary': isSecondary }" ng-transclude></div>`,
    transclude: true,
  };
});
