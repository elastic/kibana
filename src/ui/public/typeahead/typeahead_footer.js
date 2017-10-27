import { uiModules } from 'ui/modules';
const typeahead = uiModules.get('kibana/typeahead');

typeahead.directive('kbnTypeaheadFooter', function ($compile) {
  return {
    restrict: 'E',
    scope: {
      items: '=',
      template: '='
    },
    link: (scope, element) => {
      element.html(scope.template || '');
      $compile(element.contents())(scope);
    }
  };
});
