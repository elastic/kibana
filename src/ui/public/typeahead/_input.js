import 'ui/notify/directives';
import { uiModules } from 'ui/modules';
const typeahead = uiModules.get('kibana/typeahead');


typeahead.directive('kbnTypeaheadInput', function ($rootScope) {

  return {
    restrict: 'A',
    require: ['^ngModel', '^kbnTypeahead'],

    link: function ($scope, $el, $attr, deps) {
      const model = deps[0];
      const typeaheadCtrl = deps[1];

      typeaheadCtrl.setInputModel(model);

      // disable browser autocomplete
      $el.attr('autocomplete', 'off');

      // handle keypresses
      $el.on('keydown', function (ev) {
        typeaheadCtrl.keypressHandler(ev);
        digest();
      });

      // update focus state based on the input focus state
      $el.on('focus', function () {
        typeaheadCtrl.setFocused(true);
        digest();
      });

      $el.on('blur', function () {
        typeaheadCtrl.setFocused(false);
        digest();
      });

      // unbind event listeners
      $scope.$on('$destroy', function () {
        $el.off();
      });

      function digest() {
        $rootScope.$$phase || $scope.$digest();
      }
    }
  };
});
