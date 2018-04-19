import { uiModules } from '../modules';
const typeahead = uiModules.get('kibana/typeahead');

typeahead.directive('kbnTypeaheadInput', function () {
  return {
    restrict: 'A',
    require: '^kbnTypeahead',
    link: function ($scope, $el, $attr, typeahead) {
      // disable browser autocomplete
      $el.attr('autocomplete', 'off');

      $el.on('focus', () => {
        // For some reason if we don't have the $evalAsync in here, then blur events happen outside the angular lifecycle
        $scope.$evalAsync(() => typeahead.onFocus());
      });

      $el.on('blur', () => {
        $scope.$evalAsync(() => typeahead.onBlur());
      });

      $scope.$on('focus', () => {
        $el.focus();
      });

      $scope.$on('$destroy', () => {
        $el.off();
      });
    }
  };
});
