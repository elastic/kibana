import { uiModules } from 'ui/modules';
import template from './toggle_button.html';

const app = uiModules.get('kibana');

app.directive('toggleButton', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      text: '@',
      isCollapsed: '=',
      onClick: '='
    },
    controllerAs: 'toggleButton',
    bindToController: true,
    controller: class ToggleButtonController {
    }
  };
});
