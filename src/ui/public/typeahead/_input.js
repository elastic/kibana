import 'ui/notify/directives';
import { uiModules } from 'ui/modules';
const typeahead = uiModules.get('kibana/typeahead');


typeahead.directive('kbnTypeaheadInput', function () {

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
        $scope.$apply(() => typeaheadCtrl.keypressHandler(ev));
      });

      // update focus state based on the input focus state
      $el.on('focus', function () {
        $scope.$apply(() => typeaheadCtrl.setFocused(true));
      });

      $el.on('blur', function () {
        $scope.$apply(() => typeaheadCtrl.setFocused(false));
      });

      // unbind event listeners
      $scope.$on('$destroy', function () {
        $el.off();
      });
    }
  };
});
