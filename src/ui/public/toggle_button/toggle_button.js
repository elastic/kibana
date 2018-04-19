import { uiModules } from '../modules';
import template from './toggle_button.html';

const app = uiModules.get('kibana');

app.directive('toggleButton', function () {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    template: template,
    scope: {
      isDisabled: '=',
      isCollapsed: '=',
      onClick: '=',
    },
    controllerAs: 'toggleButton',
    bindToController: true,
    controller: class ToggleButtonController {
    }
  };
});
