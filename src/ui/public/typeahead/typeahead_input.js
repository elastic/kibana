import { uiModules } from 'ui/modules';
const typeahead = uiModules.get('kibana/typeahead');

typeahead.directive('kbnTypeaheadInput', function () {
  return {
    restrict: 'A',
    require: '^kbnTypeahead',
    link: function ($scope, $el, $attr, typeahead) {
      // disable browser autocomplete
      $el.attr('autocomplete', 'off');

      $el.on('focus', () => {
        $scope.$evalAsync(() => typeahead.onFocus());
      });

      $el.on('blur', () => {
        $scope.$evalAsync(() => typeahead.onBlur());
      });

      $scope.$on('$destroy', () => {
        $el.off();
      });
    }
  };
});
