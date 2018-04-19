import { uiModules } from '../modules';
const typeahead = uiModules.get('kibana/typeahead');

typeahead.directive('kbnTypeaheadItem', function ($compile) {
  return {
    restrict: 'E',
    scope: {
      item: '=',
      template: '='
    },
    link: (scope, element) => {
      element.html(scope.template || '{{item}}');
      $compile(element.contents())(scope);
    }
  };
});
