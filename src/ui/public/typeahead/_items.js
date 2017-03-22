import listTemplate from 'ui/typeahead/partials/typeahead-items.html';
import 'ui/notify/directives';
import uiModules from 'ui/modules';
const typeahead = uiModules.get('kibana/typeahead');


typeahead.directive('kbnTypeaheadItems', function () {
  return {
    restrict: 'E',
    require: '^kbnTypeahead',
    replace: true,
    template: listTemplate,

    link: function ($scope, $el, attr, typeaheadCtrl) {
      $scope.typeahead = typeaheadCtrl;
    }
  };
});
